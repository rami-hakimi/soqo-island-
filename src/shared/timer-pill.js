// The running-timer pill: three display sizes (Settings › Timer) and the placement maths the
// island uses to keep any pill inside its window. Pure, shared by the renderer and the tests.
//   small  : the original compact pill (default; existing users keep it)
//   medium : wider, with a clearly readable countdown
//   large  : prominent 44 px countdown
// On hover, medium and large grow a little to show pause / resume and reset without hiding the
// countdown; small keeps the original behaviour (hover opens the island).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).TimerPill = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SIZES = ['small', 'medium', 'large'];
  // [width, height] in CSS px (device-independent; Windows DPI scaling applies on top)
  const DIMS = { small: [300, 32], medium: [250, 44], large: [310, 60] };
  const HOVER_EXTRA = { small: 0, medium: 72, large: 84 }; // room for the two inline controls
  const FONT_PX = { small: 13.5, medium: 24, large: 44 };

  const normalize = (size) => (SIZES.includes(size) ? size : 'small');

  // size of the pill for a timer in `size`, hovered or not (vertical islands keep the small pill)
  function dims(size, { hover = false, vertical = false } = {}) {
    const s = normalize(size);
    if (vertical) return null; // the caller falls back to its vertical dimensions
    const [w, h] = DIMS[s];
    return [w + (hover ? HOVER_EXTRA[s] : 0), h];
  }

  // Does hovering show inline controls (true) or open the whole island (false, original behaviour)?
  const inlineControls = (size, timerActive) => !!timerActive && normalize(size) !== 'small';

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

  return { SIZES, DIMS, HOVER_EXTRA, FONT_PX, normalize, dims, inlineControls, place };
});
