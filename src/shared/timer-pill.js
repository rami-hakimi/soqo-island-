// The running-timer pill: three desktop sizes (Settings › Timer), the mini pill shown over other
// applications, and the placement maths the island uses to keep any pill inside its window.
// Pure, shared by the renderer and the tests.
//   small  : 300 × 38 with a 17 px countdown (default)
//   medium : 260 × 50 with a 28 px countdown
//   large  : 400 × 88 with a 64 px countdown, readable from across the room
//   mini   : 168 × 28 with a 15 px countdown; used while an app is in front so the pill covers
//            no tabs or toolbar buttons (the Settings size is the DESKTOP size)
// On hover, medium and large grow a little to show pause / resume and reset without hiding the
// countdown; small and mini keep the original behaviour (hover opens the island).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).TimerPill = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SIZES = ['small', 'medium', 'large']; // what Settings offers
  const MINI = 'mini';
  // [width, height] in CSS px (device-independent; Windows DPI scaling applies on top)
  const DIMS = { small: [300, 38], medium: [260, 50], large: [400, 88], mini: [168, 28] };
  const HOVER_EXTRA = { small: 0, medium: 72, large: 104, mini: 0 }; // room for the two inline controls
  const FONT_PX = { small: 17, medium: 28, large: 64, mini: 15 };

  const normalize = (size) => (SIZES.includes(size) ? size : 'small');
  const known = (size) => (size === MINI ? MINI : normalize(size));

  // The size to draw now: the Settings size on the desktop, the mini pill over an application.
  function displaySize(setting, { frontApp = false } = {}) {
    return frontApp ? MINI : normalize(setting);
  }

  // size of the pill for a timer in `size`, hovered or not (vertical islands keep the small pill)
  function dims(size, { hover = false, vertical = false } = {}) {
    const s = known(size);
    if (vertical) return null; // the caller falls back to its vertical dimensions
    const [w, h] = DIMS[s];
    return [w + (hover ? HOVER_EXTRA[s] : 0), h];
  }

  // Does hovering show inline controls (true) or open the whole island (false, original behaviour)?
  const inlineControls = (size, timerActive) => !!timerActive && ['medium', 'large'].includes(known(size));

  // Centre a pill of [w, h] on an anchor (window coordinates) and keep it inside the window:
  // near an edge it opens inward instead of off screen. Mirrors the island's CSS variables.
  function place(anchor, [w, h], viewport, margin = 4) {
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const W = viewport.width;
    const H = viewport.height;
    if (anchor.vertical) {
      return { x: anchor.side === 'left' ? 0 : W - w, y: clamp(anchor.y - h / 2, margin, H - h - margin) };
    }
    return {
      x: clamp(anchor.x - w / 2, margin, W - w - margin),
      y: anchor.docked ? 0 : clamp(anchor.y, 0, H - h - 6),
    };
  }

  return { SIZES, MINI, DIMS, HOVER_EXTRA, FONT_PX, normalize, displaySize, dims, inlineControls, place };
});
