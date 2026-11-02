// Coding-agent hook relay and window focusing.
//
//   soqo-helper hook claude|codex   (run BY Claude Code / Codex as a hook)
//     Reads the hook's JSON from stdin, keeps only the fields the island needs (never prompts,
//     replies, file contents or transcripts), finds the terminal window the agent runs in (the
//     parent-process chain of this very process) and hands one line to the running island over
//     its private named pipe, authenticated with the token the island wrote for this user.
//     Prints nothing, always exits 0: a hook must never slow down or block the agent.
//
//   focus <hwnd> / focusproc <name>   (bridge commands from the island)
//     Brings a window to the front: the terminal of a session, or the app that sent a
//     notification. Only ever activates an existing window; nothing is launched.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

static class Agents {
  const int MaxStdin = 1024 * 1024;
  const int MaxString = 400;
  // top-level hook fields worth keeping (both agents use this vocabulary)
  static readonly string[] Keep = { "session_id", "thread_id", "hook_event_name", "cwd", "tool_name", "tool_use_id", "notification_type", "matcher", "title", "message", "reason", "error", "stop_hook_active", "permission_mode", "source" };
  // tool_input fields that make a one-line summary; never "content", "prompt", "old_string"…
  static readonly string[] KeepInput = { "command", "file_path", "path", "notebook_path", "url", "pattern", "query", "description", "skill" };

  static string Cut(object v) {
    if (v == null) return null;
    string s = v is string ? (string)v : Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture);
    s = Regex.Replace(s, @"[\u0000-\u001f\u007f]+", " ");
    return s.Length > MaxString ? s.Substring(0, MaxString) : s;
  }

  static Dictionary<string, object> Whitelist(Dictionary<string, object> raw) {
    var o = new Dictionary<string, object>();
    foreach (var k in Keep) {
      object v;
      if (!raw.TryGetValue(k, out v) || v == null) continue;
      if (v is bool) o[k] = v; else if (v is string || v is int || v is long || v is double || v is decimal) o[k] = Cut(v);
    }
    object ti;
    if (raw.TryGetValue("tool_input", out ti) && ti is Dictionary<string, object>) {
      var inp = new Dictionary<string, object>();
      foreach (var k in KeepInput) {
        object v;
        if (((Dictionary<string, object>)ti).TryGetValue(k, out v) && v is string) inp[k] = Cut(v);
      }
      o["tool_input"] = inp;
    }
    return o;
  }

  // --- the process chain above this hook: bash <- node (claude) <- pwsh <- Windows Terminal ---
  [StructLayout(LayoutKind.Sequential)]
  struct PROCESS_BASIC_INFORMATION { public IntPtr Reserved1; public IntPtr PebBaseAddress; public IntPtr Reserved2a; public IntPtr Reserved2b; public IntPtr UniqueProcessId; public IntPtr InheritedFromUniqueProcessId; }
  [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h, int cls, ref PROCESS_BASIC_INFORMATION info, int len, out int ret);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);

  static int ParentOf(int pid) {
    IntPtr h = OpenProcess(0x1000, false, pid); // PROCESS_QUERY_LIMITED_INFORMATION
    if (h == IntPtr.Zero) return 0;
    try {
      var info = new PROCESS_BASIC_INFORMATION();
      int ret;
      if (NtQueryInformationProcess(h, 0, ref info, Marshal.SizeOf(info), out ret) != 0) return 0;
      return info.InheritedFromUniqueProcessId.ToInt32();
    } catch { return 0; } finally { CloseHandle(h); }
  }

  static string NameOf(int pid) {
    try { using (var p = Process.GetProcessById(pid)) return p.ProcessName; } catch { return ""; }
  }

  // this process, its parent, and so on (names only; at most 12 levels)
  public static List<KeyValuePair<int, string>> Chain() {
    var chain = new List<KeyValuePair<int, string>>();
    int pid = Process.GetCurrentProcess().Id;
    var seen = new HashSet<int>();
    for (int i = 0; i < 12 && pid > 4 && !seen.Contains(pid); i++) {
      seen.Add(pid);
      string name = NameOf(pid);
      if (name == "") break;
      chain.Add(new KeyValuePair<int, string>(pid, name));
      pid = ParentOf(pid);
    }
    return chain;
  }

  // --- windows ---
  delegate bool EnumWindowsProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out Win.RECT r);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder sb, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("user32.dll")] static extern void SwitchToThisWindow(IntPtr h, bool altTab);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();

  // the largest visible top-level window owned by one of the given processes
  public static IntPtr WindowOf(ICollection<int> pids, out int ownerPid) {
    IntPtr best = IntPtr.Zero;
    long bestArea = -1;
    int bestPid = 0;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h) || GetWindow(h, 4) != IntPtr.Zero) return true; // GW_OWNER: owned popups don't count
      uint pid;
      GetWindowThreadProcessId(h, out pid);
      if (!pids.Contains((int)pid)) return true;
      if (GetWindowTextLength(h) == 0) return true;
      Win.RECT r;
      if (!GetWindowRect(h, out r)) return true;
      long area = (long)Math.Max(0, r.R - r.L) * Math.Max(0, r.B - r.T);
      if (area > bestArea) { bestArea = area; best = h; bestPid = (int)pid; }
      return true;
    }, IntPtr.Zero);
    ownerPid = bestPid;
    return best;
  }

  static string TitleOf(IntPtr h) {
    var sb = new StringBuilder(256);
    GetWindowText(h, sb, 256);
    return sb.ToString();
  }

  // The window the agent's terminal lives in: the nearest ancestor that owns a visible window
  // (Windows Terminal, VS Code, a console host…). Falls back to this process's console window.
  static Dictionary<string, object> Target(List<KeyValuePair<int, string>> chain) {
    // skip ourselves and the shell that launched us: the first ancestors never own a window
    for (int i = 1; i < chain.Count; i++) {
      int owner;
      IntPtr h = WindowOf(new[] { chain[i].Key }, out owner);
      if (h == IntPtr.Zero) continue;
      var t = new Dictionary<string, object>();
      t["hwnd"] = h.ToInt64(); t["pid"] = chain[i].Key; t["proc"] = chain[i].Value; t["title"] = Cut(TitleOf(h));
      return t;
    }
    IntPtr c = GetConsoleWindow();
    if (c != IntPtr.Zero && IsWindowVisible(c)) {
      uint pid;
      GetWindowThreadProcessId(c, out pid);
      var t = new Dictionary<string, object>();
      t["hwnd"] = c.ToInt64(); t["pid"] = (int)pid; t["proc"] = NameOf((int)pid); t["title"] = Cut(TitleOf(c));
      return t;
    }
    return null;
  }

  // Bring a window to the front. Windows only lets the foreground process hand focus over, so
  // the usual dance: restore if minimized, tap Alt (an input event for this process), attach to
  // the foreground thread's input, then ask.
  public static bool Focus(IntPtr h) {
    if (h == IntPtr.Zero || !IsWindow(h)) return false;
    try {
      if (IsIconic(h)) ShowWindow(h, 9); // SW_RESTORE
      IntPtr fg = GetForegroundWindow();
      uint fgThread = fg == IntPtr.Zero ? 0 : GetWindowThreadProcessId(fg, out _unused);
      uint me = GetCurrentThreadId();
      keybd_event(0x12, 0, 0, UIntPtr.Zero); // VK_MENU down
      keybd_event(0x12, 0, 2, UIntPtr.Zero); // up
      if (fgThread != 0 && fgThread != me) AttachThreadInput(me, fgThread, true);
      try {
        BringWindowToTop(h);
        SetForegroundWindow(h);
      } finally {
        if (fgThread != 0 && fgThread != me) AttachThreadInput(me, fgThread, false);
      }
      if (GetForegroundWindow() != h) SwitchToThisWindow(h, true);
      return GetForegroundWindow() == h;
    } catch { return false; }
  }
  static uint _unused;

  // the largest visible window of a process name (letters, digits, - and _ only)
  public static bool FocusProcess(string name) {
    if (!Regex.IsMatch(name ?? "", @"^[A-Za-z0-9_.-]{1,64}$")) return false;
    var pids = new List<int>();
    foreach (var p in Process.GetProcessesByName(name)) { pids.Add(p.Id); p.Dispose(); }
    if (pids.Count == 0) return false;
    int owner;
    IntPtr h = WindowOf(pids, out owner);
    return h != IntPtr.Zero && Focus(h);
  }

  // --- the hook itself ---
  // bridgeFile: an explicit path (development runs with their own data folder); otherwise the
  // data folder of this user's installation (%APPDATA%\soqo-island)
  static readonly bool Debug = Environment.GetEnvironmentVariable("SOQO_HOOK_DEBUG") == "1";
  static void Trace(string m) { if (Debug) Console.Error.WriteLine("[soqo hook] " + m); }

  public static int Hook(string agent, string bridgeFile) {
    try {
      if (agent != "claude" && agent != "codex") return 0;
      // the island's bridge for this user: pipe name and token (written by the island while
      // Coding Agents is on; missing = the island is not listening, nothing to do)
      string file = bridgeFile;
      if (string.IsNullOrEmpty(file)) {
        string appData = Environment.GetEnvironmentVariable("APPDATA");
        if (string.IsNullOrEmpty(appData)) appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        file = Path.Combine(appData, "soqo-island", "agents-bridge.json");
      }
      if (!File.Exists(file)) { Trace("no bridge file " + file); return 0; }
      var ser = new JavaScriptSerializer { MaxJsonLength = 4 * 1024 * 1024 };
      var bridge = ser.DeserializeObject(File.ReadAllText(file, Encoding.UTF8)) as Dictionary<string, object>;
      if (bridge == null) return 0;
      string pipe = bridge.ContainsKey("pipe") ? bridge["pipe"] as string : null;
      string token = bridge.ContainsKey("token") ? bridge["token"] as string : null;
      if (string.IsNullOrEmpty(pipe) || string.IsNullOrEmpty(token) || !Regex.IsMatch(pipe, @"^soqo-island-agents-[0-9a-f]{8,32}$")) { Trace("bad bridge file"); return 0; }

      // the hook payload (bounded)
      string input;
      using (var stdin = Console.OpenStandardInput()) {
        var buf = new byte[65536];
        var ms = new MemoryStream();
        int n;
        while ((n = stdin.Read(buf, 0, buf.Length)) > 0) {
          if (ms.Length + n > MaxStdin) break;
          ms.Write(buf, 0, n);
        }
        input = Encoding.UTF8.GetString(ms.ToArray());
      }
      Dictionary<string, object> raw = null;
      try { raw = ser.DeserializeObject(input) as Dictionary<string, object>; } catch (Exception e) { Trace("parse: " + e.Message); }
      if (raw == null) { Trace("payload is not a JSON object (" + input.Length + " bytes)"); return 0; }

      var chain = Chain();
      var names = new List<string>();
      foreach (var kv in chain) names.Add(kv.Value);
      var msg = new Dictionary<string, object>();
      msg["v"] = 1;
      msg["agent"] = agent;
      msg["token"] = token;
      msg["event"] = Whitelist(raw);
      msg["chain"] = names;
      msg["hookPid"] = Process.GetCurrentProcess().Id;
      var target = Target(chain);
      if (target != null) msg["target"] = target;
      string line = ser.Serialize(msg) + "\n";

      using (var client = new NamedPipeClientStream(".", pipe, PipeDirection.Out)) {
        client.Connect(800);
        var bytes = Encoding.UTF8.GetBytes(line);
        client.Write(bytes, 0, bytes.Length);
        client.Flush();
      }
      Trace("sent " + line.Length + " chars to " + pipe);
    } catch (Exception e) { Trace(e.ToString()); }
    return 0;
  }
}
