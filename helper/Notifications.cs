// Windows notifications, through the official listener (Windows.UI.Notifications.Management.
// UserNotificationListener): the toasts other apps delivered to Action Center, as Windows
// itself shows them. Only while the island asked for it ("notif on"); off by default.
//
// What is read: the sending app's display name and AppUserModelId, the toast's title and body
// text, its id and time. Nothing else (no browser pages, no conversations, no storage). The
// list is polled every poll (the change event is not delivered to apps without package
// identity); only toasts that appeared after enabling are reported, and ids that disappear from
// Action Center are reported as gone so the island drops them too.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Windows.Foundation;
using Windows.UI.Notifications;
using Windows.UI.Notifications.Management;

static class Notifications {
  public static bool Enabled;
  public static bool Preview = true;
  static UserNotificationListener listener;
  static readonly HashSet<uint> known = new HashSet<uint>();
  static bool seeded;
  static string lastAccess = "";
  const int MaxBurst = 5;

  [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);

  static T Await<T>(IAsyncOperation<T> op, int ms) {
    if (op == null) return default(T);
    try {
      var until = DateTime.UtcNow.AddMilliseconds(ms);
      while (op.Status == AsyncStatus.Started) {
        if (DateTime.UtcNow > until) { op.Cancel(); return default(T); }
        Thread.Sleep(5);
      }
      return op.Status == AsyncStatus.Completed ? op.GetResults() : default(T);
    } catch { return default(T); }
  }

  static string Esc(string s) {
    var sb = new StringBuilder();
    foreach (char c in s ?? "") {
      switch (c) {
        case '"': sb.Append("\\\""); break;
        case '\\': sb.Append("\\\\"); break;
        case '\n': sb.Append("\\n"); break;
        case '\r': sb.Append("\\r"); break;
        case '\t': sb.Append("\\t"); break;
        default: if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4")); else sb.Append(c); break;
      }
    }
    return sb.ToString();
  }
  static string Cut(string s, int n) { s = s ?? ""; return s.Length > n ? s.Substring(0, n) : s; }

  // "allowed" | "denied" | "unspecified" | "unavailable"; asks Windows the first time. Polling
  // runs on its own thread (WinRT calls can take a moment) and queues JSON fragments that the
  // bridge loop drains into its next line.
  static Thread worker;
  static readonly object gate = new object();
  static readonly List<KeyValuePair<string, string>> queue = new List<KeyValuePair<string, string>>();
  public static string Enable(bool preview) {
    Preview = preview;
    Enabled = true;
    seeded = false;
    known.Clear();
    lastAccess = "";
    if (worker == null || !worker.IsAlive) {
      worker = new Thread(Loop) { IsBackground = true };
      worker.Start();
    }
    return null; // the worker reports notifAccess once Windows answered
  }

  static readonly bool Debug = Environment.GetEnvironmentVariable("SOQO_NOTIF_DEBUG") == "1";
  static void Trace(string m) { if (Debug) Console.Error.WriteLine("[soqo notif] " + m); }

  // Everything WinRT happens on this thread: the listener, the access request, the scans.
  static void Loop() {
    Trace("worker started");
    try {
      if (listener == null) listener = UserNotificationListener.Current;
      var st = Await(listener.RequestAccessAsync(), 8000);
      lastAccess = Access(st);
      Queue("notifAccess", "\"" + lastAccess + "\"");
      Trace("access " + lastAccess);
    } catch (Exception e) {
      Trace("listener: " + e);
      lastAccess = "unavailable";
      Queue("notifAccess", "\"unavailable\"");
      Enabled = false;
    }
    while (Enabled) {
      try { Scan(); } catch (Exception e) { Trace("loop: " + e); }
      Thread.Sleep(1500);
    }
    Trace("worker stopped");
  }

  static void Queue(string key, string rawJson) { lock (gate) { queue.Add(new KeyValuePair<string, string>(key, rawJson)); } }

  // called from the bridge loop: hand over whatever the worker collected
  public static void Poll(Json o) {
    List<KeyValuePair<string, string>> items;
    lock (gate) { if (queue.Count == 0) return; items = new List<KeyValuePair<string, string>>(queue); queue.Clear(); }
    var merged = new Dictionary<string, string>();
    var lists = new Dictionary<string, StringBuilder>();
    foreach (var kv in items) {
      if (kv.Key == "notif" || kv.Key == "notifGone") {
        StringBuilder sb;
        if (!lists.TryGetValue(kv.Key, out sb)) { sb = new StringBuilder(); lists[kv.Key] = sb; }
        if (sb.Length > 0) sb.Append(',');
        sb.Append(kv.Value);
      } else merged[kv.Key] = kv.Value;
    }
    foreach (var kv in merged) o.Raw(kv.Key, kv.Value);
    foreach (var kv in lists) o.Raw(kv.Key, "[" + kv.Value + "]");
  }

  public static void Disable() { Enabled = false; seeded = false; known.Clear(); lock (gate) { queue.Clear(); } }

  static string Access(UserNotificationListenerAccessStatus st) {
    return st == UserNotificationListenerAccessStatus.Allowed ? "allowed" : st == UserNotificationListenerAccessStatus.Denied ? "denied" : "unspecified";
  }

  // Windows' own "accepts notifications now" state (5 = yes; busy, full screen, presentation
  // mode or quiet time otherwise): the island stays quiet when Windows would
  public static bool Quiet() {
    try { int s; return SHQueryUserNotificationState(out s) == 0 && s != 5 && s != 1; } catch { return false; }
  }

  // one scan of Action Center: notif (new toasts), notifGone (dismissed ids), notifAccess
  // (when it changes), quiet
  static void Scan() {
    if (!Enabled || listener == null) return;
    try {
      Trace("scan begin");
      string access = Access(listener.GetAccessStatus());
      if (access != lastAccess) { lastAccess = access; Queue("notifAccess", "\"" + access + "\""); }
      if (access != "allowed") { Trace("access " + access); return; }
      var op = listener.GetNotificationsAsync(NotificationKinds.Toast);
      var list = Await(op, 4000);
      if (list == null) { Trace("no list: status=" + op.Status + " err=" + (op.ErrorCode == null ? "" : op.ErrorCode.Message)); return; }
      Trace("scan: " + list.Count + " toasts, seeded=" + seeded);
      var now = new HashSet<uint>();
      var fresh = new StringBuilder();
      int added = 0;
      foreach (var n in list) {
        now.Add(n.Id);
        if (!seeded || known.Contains(n.Id)) continue;
        if (added >= MaxBurst) continue;
        string app = "", aumid = "";
        try { app = n.AppInfo.DisplayInfo.DisplayName; aumid = n.AppInfo.AppUserModelId; } catch { }
        if (app == "Soqo Island" || aumid == "com.soqoisland.app") continue;
        string title = "", body = "";
        try {
          var b = n.Notification.Visual.GetBinding(KnownNotificationBindings.ToastGeneric);
          if (b != null) {
            int i = 0;
            foreach (var t in b.GetTextElements()) {
              if (i == 0) title = t.Text; else body += (body == "" ? "" : " · ") + t.Text;
              i++;
            }
          }
        } catch { }
        if (fresh.Length > 0) fresh.Append(',');
        fresh.Append("{\"id\":").Append(n.Id.ToString(CultureInfo.InvariantCulture))
          .Append(",\"app\":\"").Append(Esc(Cut(app, 80))).Append("\",\"aumid\":\"").Append(Esc(Cut(aumid, 200)))
          .Append("\",\"title\":\"").Append(Esc(Cut(title, 160))).Append("\",\"body\":\"").Append(Preview ? Esc(Cut(body, 240)) : "")
          .Append("\",\"at\":").Append(n.CreationTime.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture)).Append('}');
        added++;
      }
      var gone = new StringBuilder();
      foreach (var id in known) if (!now.Contains(id)) { if (gone.Length > 0) gone.Append(','); gone.Append(id.ToString(CultureInfo.InvariantCulture)); }
      known.Clear();
      foreach (var id in now) known.Add(id);
      if (!seeded) { seeded = true; Queue("quiet", Quiet() ? "true" : "false"); return; }
      if (fresh.Length > 0) Queue("notif", fresh.ToString());
      if (gone.Length > 0) Queue("notifGone", gone.ToString());
      Queue("quiet", Quiet() ? "true" : "false");
    } catch (Exception e) {
      Trace("scan: " + e);
      Queue("notifError", "\"" + Esc(Cut(e.Message, 120)) + "\"");
    }
  }
}
