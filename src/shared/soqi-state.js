// Soqi's mood: a tiny state machine shared by the island renderer (classic script) and the unit
// tests (CommonJS). Short reactions to events sit on top of a resting state derived from what
// is going on (away, cursor nearby, music). No DOM here.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).SoqiState = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const STATES = ['idle', 'happy', 'excited', 'curious', 'listening', 'music', 'sleeping', 'notification', 'download', 'warning'];
  // a stronger reaction replaces a weaker one; an equal or weaker one waits its turn
  const PRIORITY = { warning: 5, download: 4, notification: 4, excited: 3, happy: 3, curious: 2, sleeping: 1, music: 1, listening: 1, idle: 0 };
  const DEFAULT_MS = { warning: 5000, download: 5000, notification: 4000, excited: 3000, happy: 6000, curious: 2500, sleeping: 4000, music: 3000, listening: 3000, idle: 1500 };

  function createMachine(now = () => Date.now()) {
    let reaction = null; // { state, until }
    const ctx = { away: false, near: false, typing: false, hasMedia: false, playing: false };

    function resting() {
      if (ctx.away) return 'sleeping';
      if (ctx.typing || ctx.near) return 'curious';
      if (ctx.hasMedia && ctx.playing) return 'music';
      if (ctx.hasMedia) return 'listening';
      return 'idle';
    }

    return {
      STATES,
      // A short-lived mood. Returns true when it took effect now.
      react(state, ms) {
        if (!STATES.includes(state)) return false;
        const t = now();
        if (reaction && reaction.until > t && PRIORITY[reaction.state] > PRIORITY[state]) return false;
        reaction = { state, until: t + (ms > 0 ? ms : DEFAULT_MS[state]) };
        return true;
      },
      set(key, value) {
        if (key in ctx) ctx[key] = !!value;
      },
      context: () => ({ ...ctx }),
      reacting: () => !!(reaction && reaction.until > now()),
      current() {
        if (reaction && reaction.until <= now()) reaction = null;
        return reaction ? reaction.state : resting();
      },
      clear() {
        reaction = null;
      },
    };
  }

  return { STATES, PRIORITY, DEFAULT_MS, createMachine };
});
