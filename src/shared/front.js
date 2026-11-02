// What is in front of the island: the desktop or an application window. The helper reports the
// foreground window every poll; this module turns that into a steady 'desktop' / 'app' value.
//   - the desktop, the taskbar, the Start menu / search flyouts and the island's own windows
//     (Settings, Focus Mode) count as the desktop;
//   - every other window (a browser, Explorer, an editor, a chat app) is an app.
// A running timer shows at its Settings size on the desktop and shrinks to the mini pill over an
// app. Rapid Alt+Tab switches are smoothed with a short settle time so the pill never flickers.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).Front = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SHELL_PROCS = ['', 'startmenuexperiencehost', 'searchhost', 'searchapp', 'shellexperiencehost', 'lockapp', 'textinputhost'];
  const SETTLE_MS = 220;

  function classify({ shell = false, proc = '', own = '' } = {}) {
    if (shell) return 'desktop';
    const p = String(proc || '').toLowerCase();
    if (SHELL_PROCS.includes(p)) return 'desktop';
    if (own && p === String(own).toLowerCase()) return 'desktop';
    return 'app';
  }

  // A value must be reported for settleMs before it is taken over; a flicker through another
  // value and back is ignored. feed() returns true when the committed value changed.
  function settled(initial = 'desktop', settleMs = SETTLE_MS) {
    let committed = initial;
    let pending = null;
    let pendingAt = 0;
    return {
      feed(value, now = Date.now()) {
        if (value === committed) {
          pending = null;
          return false;
        }
        if (value !== pending) {
          pending = value;
          pendingAt = now;
          return false;
        }
        if (now - pendingAt < settleMs) return false;
        committed = value;
        pending = null;
        return true;
      },
      get value() { return committed; },
      get pending() { return pending; },
      settleMs,
    };
  }

  return { classify, settled, SHELL_PROCS, SETTLE_MS };
});
