// Where the island window goes. The island's position is an "anchor": the top-centre of the
// collapsed pill in screen coordinates (DIPs). These pure functions keep the anchor on its
// display, place the (always fully on-screen) window around it and work out the browser
// address-bar slot. Shared by main and the tests; the numbers mirror main.js and style.css.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).Placement = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  const DEFAULTS = {
    WIN_W: 640, WIN_H: 356, // the transparent window the island lives in
    PILL_HALF_W: 120, PILL_H: 34, FLOAT_TOP: 8, HEADROOM: 44, V_PILL_HALF_H: 124,
  };

  // the island's own spot on a display: top centre, FLOAT_TOP below the edge
  function defaultAnchor(bounds, c = DEFAULTS) {
    return { x: bounds.x + bounds.width / 2, y: bounds.y + c.FLOAT_TOP };
  }

  // Clamp the anchor to the display and position the window around it.
  // display: { bounds, workArea }; prefs: { vertical, side, docked }.
  // Returns { anchor: {x, y}, win: {x, y} } — the anchor comes back clamped.
  function layout(anchor, display, prefs, consts = {}) {
    const c = { ...DEFAULTS, ...consts };
    const b = display.bounds;
    const wa = display.workArea || b;
    const a = { x: anchor.x, y: anchor.y };
    let wx;
    let wy;
    if (prefs.vertical) {
      a.x = prefs.side === 'left' ? b.x : b.x + b.width;
      a.y = clamp(a.y, wa.y + c.V_PILL_HALF_H, wa.y + wa.height - c.V_PILL_HALF_H);
      wx = prefs.side === 'left' ? b.x : b.x + b.width - c.WIN_W;
      wy = Math.round(clamp(a.y - c.WIN_H / 2, wa.y, wa.y + wa.height - c.WIN_H));
    } else {
      a.x = clamp(a.x, b.x + c.PILL_HALF_W, b.x + b.width - c.PILL_HALF_W);
      a.y = prefs.docked ? b.y : clamp(a.y, b.y, wa.y + wa.height - c.PILL_H - 6);
      wx = Math.round(clamp(a.x - c.WIN_W / 2, b.x, b.x + b.width - c.WIN_W));
      wy = Math.round(prefs.docked ? b.y : clamp(a.y - c.HEADROOM, b.y, wa.y + wa.height - c.WIN_H));
    }
    return { anchor: a, win: { x: wx, y: wy } };
  }

  // Is the anchor at the island's own place (top centre of its display)?
  function atDefaultPlace(anchor, bounds, c = DEFAULTS) {
    return Math.abs(anchor.x - (bounds.x + bounds.width / 2)) < 2 && anchor.y - bounds.y <= c.FLOAT_TOP + 2;
  }

  // The browser address-bar slot (opt-in): the island takes the right third of the omnibox
  // rectangle r (DIPs) on display bounds b. Returns null when that third is not fully on the
  // display, so a half off-screen browser window never drags the island with it.
  function addressBarSlot(r, b, consts = {}) {
    const c = { ...DEFAULTS, ...consts };
    const third = r.width / 3;
    const sh = Math.round(Math.min(30, Math.max(22, r.height + 6)));
    const sw = Math.round(Math.min(third - 12, 380));
    const cx = r.x + r.width - third / 2;
    const top = Math.round(r.y + r.height / 2 - sh / 2);
    if (cx - sw / 2 < b.x || cx + sw / 2 > b.x + b.width || top < b.y || top + sh > b.y + b.height) return null;
    const wx = Math.round(clamp(cx - c.WIN_W / 2, b.x, b.x + b.width - c.WIN_W));
    const wy = Math.round(clamp(top - c.FLOAT_TOP, b.y, b.y + b.height - c.WIN_H));
    return { win: { x: wx, y: wy }, cx, top, sw, sh };
  }

  return { DEFAULTS, clamp, defaultAnchor, layout, atDefaultPlace, addressBarSlot };
});
