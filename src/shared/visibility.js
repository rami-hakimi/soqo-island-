// When is the island window shown? One pure rule, shared by main and the tests.
//   - the user hid it (tray / Settings › Show island): never shown;
//   - a full-screen app is in front and "Hide in full screen" is on: hidden;
//   - a maximized app is in front and "Hide while an app is maximized" is on: hidden;
//   - except that a running timer stays when the user opted in to "Keep a running timer
//     visible in full screen" (the same opt-in covers maximized apps).
// Hiding never touches the timer itself: it keeps counting in the renderer.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).Visibility = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function shouldShow({ userHidden = false, fullscreen = false, maximized = false, hideFullscreen = true, hideMaximized = false, timerRunning = false, timerOnTop = false } = {}) {
    if (userHidden) return false;
    const covered = (fullscreen && hideFullscreen) || (maximized && hideMaximized);
    if (!covered) return true;
    return !!(timerRunning && timerOnTop);
  }
  return { shouldShow };
});
