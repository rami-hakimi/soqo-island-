// When does the click-through island window start taking the mouse? Shared by main and tests.
//   - idle / compact pills: only after the cursor has rested on the island (hover intent), so a
//     quick sweep towards a browser tab underneath never gets caught;
//   - cards and scenes with controls (a dhikr card's ×, a scene's buttons, a toast with an
//     action): at once, so the first click lands on the button instead of falling through to
//     whatever is behind the island.
// Closing a card "releases" the mouse: the window goes click-through again until the cursor
// leaves the island, so nothing pops open under the pointer.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).HoverPolicy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const INTENT_MS = 280;

  // extra pixels around the island that still count as "inside"
  const pad = ({ active, instant }) => (active ? 8 : instant ? 10 : 2);

  // Should the window become interactive now?
  function shouldActivate({ inside, active, suppressed, instant, sinceEnterMs }) {
    if (!inside || active || suppressed) return false;
    return !!instant || sinceEnterMs >= INTENT_MS;
  }

  // cursor poll period: fast while something clickable is on screen, relaxed otherwise
  const pollMs = (instant) => (instant ? 16 : 40);

  // modes whose content has buttons the user must be able to hit at once
  const instantFor = (mode, hasToastAction) => mode === 'reminder' || mode === 'scene' || (mode === 'toast' && !!hasToastAction);

  return { INTENT_MS, pad, pollMs, shouldActivate, instantFor };
});
