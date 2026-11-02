// When is the island window shown? One pure rule plus a small state holder, shared by main and
// the tests.
//   - the user hid it (menu / tray / Settings › Show island): never shown;
//   - Focus Mode's full-screen view is in front: the island waits behind it;
//   - a full-screen app is in front and "Hide in full screen" is on: hidden;
//   - a maximized app is in front and "Hide while an app is maximized" is on: hidden;
//   - except that a running timer stays when the user opted in to "Keep a running timer
//     visible in full screen" (the same opt-in covers maximized apps).
// Hiding never touches the timer itself: it keeps counting in the renderer. The user's choice
// is never saved: every start of the app shows the island again.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).Visibility = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function shouldShow({ userHidden = false, focusMode = false, fullscreen = false, maximized = false, hideFullscreen = true, hideMaximized = false, timerRunning = false, timerOnTop = false } = {}) {
    if (userHidden || focusMode) return false;
    const covered = (fullscreen && hideFullscreen) || (maximized && hideMaximized);
    if (!covered) return true;
    return !!(timerRunning && timerOnTop);
  }

  // Why is the island hidden right now? null when it is shown.
  function hiddenBy(s) {
    if (shouldShow(s)) return null;
    if (s.userHidden) return 'user';
    if (s.focusMode) return 'focus';
    if (s.fullscreen && s.hideFullscreen !== false) return 'fullscreen';
    return 'maximized';
  }

  // The island's visibility state: what the user asked for, what is in front, the switches.
  // apply(show) runs after every update (main shows or hides the window there).
  function controller(apply) {
    const s = { userHidden: false, focusMode: false, fullscreen: false, maximized: false, hideFullscreen: true, hideMaximized: false, timerRunning: false, timerOnTop: false };
    const evaluate = () => {
      const show = shouldShow(s);
      apply(show, s);
      return show;
    };
    return {
      update(patch) {
        Object.assign(s, patch || {});
        return evaluate();
      },
      hide() { return this.update({ userHidden: true }); },
      show() { return this.update({ userHidden: false }); },
      toggle() { return this.update({ userHidden: !s.userHidden }); },
      // the user started the app again while it was running: they want to see the island
      reveal() { return this.update({ userHidden: false }); },
      get hidden() { return s.userHidden; },
      get shown() { return shouldShow(s); },
      reason() { return hiddenBy(s); },
      // context-menu entry: the action available now, never a stale checkbox
      menuKey() { return s.userHidden ? 'menu.show' : 'menu.hide'; },
      state() { return { ...s }; },
    };
  }

  return { shouldShow, hiddenBy, controller };
});
