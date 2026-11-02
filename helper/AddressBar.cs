// The address bar ("omnibox") of a Chromium browser in front: where it is on screen, whether the
// user is typing in it, and how long its text is. The island sits in its right third.
// The UI Automation search for it is slow-ish, so it is done once per browser window (retried
// every 2 s if not found); after that only the element's properties are read each tick.
using System;
using System.Windows.Automation;

static class AddressBar {
  static readonly string[] Browsers = { "chrome", "msedge", "brave", "opera", "vivaldi" };

  // The omnibox is an Edit control in the browser's toolbar: within the top band of the window
  // and not inside the web page (a Document element). The first Edit in the tree used to be
  // taken, which could be a text field on the page itself; the island then sat over the page.
  static AutomationElement FindOmnibox(IntPtr fg) {
    Win.RECT wr;
    if (!Win.WindowRect(fg, out wr)) return null;
    double bandBottom = wr.T + Math.Min(200, (wr.B - wr.T) * 0.2);
    var root = AutomationElement.FromHandle(fg);
    var all = root.FindAll(TreeScope.Descendants, new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit));
    AutomationElement best = null;
    double bestWidth = 0;
    var walker = TreeWalker.ControlViewWalker;
    foreach (AutomationElement e in all) {
      System.Windows.Rect r;
      try { r = e.Current.BoundingRectangle; } catch { continue; }
      if (r.IsEmpty || r.Width < 200 || r.Height < 16 || r.Y > bandBottom) continue;
      bool inPage = false;
      try {
        for (var p = walker.GetParent(e); p != null && p != root; p = walker.GetParent(p)) {
          if (p.Current.ControlType == ControlType.Document) { inPage = true; break; }
        }
      } catch { inPage = true; }
      if (inPage) continue;
      if (r.Width > bestWidth) { best = e; bestWidth = r.Width; }
    }
    return best;
  }
  static IntPtr hwnd = IntPtr.Zero;
  static AutomationElement edit;
  static DateTime nextSearch = DateTime.MinValue;

  // JSON object for the bridge line, or "null" when no browser address bar is in front
  public static string Json(IntPtr fg, string proc, bool fullscreen) {
    if (fullscreen || fg == IntPtr.Zero || Array.IndexOf(Browsers, (proc ?? "").ToLowerInvariant()) < 0 || Win.ClassOf(fg) != "Chrome_WidgetWin_1") {
      hwnd = IntPtr.Zero;
      edit = null;
      return "null";
    }
    if (fg != hwnd) {
      hwnd = fg;
      edit = null;
      nextSearch = DateTime.MinValue;
    }
    if (edit == null) {
      if (DateTime.UtcNow < nextSearch) return "null";
      nextSearch = DateTime.UtcNow.AddSeconds(2);
      try { edit = FindOmnibox(fg); } catch { edit = null; }
      if (edit == null) return "null";
    }
    try {
      var r = edit.Current.BoundingRectangle;
      if (r.IsEmpty || r.Width < 200 || r.Height < 16) return "null";
      bool focus = edit.Current.HasKeyboardFocus;
      int len = 0;
      try { len = (((ValuePattern)edit.GetCurrentPattern(ValuePattern.Pattern)).Current.Value ?? "").Length; } catch { }
      return "{\"x\":" + (int)r.X + ",\"y\":" + (int)r.Y + ",\"w\":" + (int)r.Width + ",\"h\":" + (int)r.Height
        + ",\"focus\":" + (focus ? "true" : "false") + ",\"len\":" + len + "}";
    } catch {
      edit = null; // the window changed under us (navigated, closed): search again
      return "null";
    }
  }
}
