// Battery: what Windows reports (GetSystemPowerStatus through the helper) turned into the few
// words and numbers the island shows. Pure and shared (renderer + tests). Nothing is guessed: a
// PC without a battery says so, an unknown percentage stays unknown.
//
//   view(raw) -> { present, state, pct, low, critical, saver, minutes }
//     state: 'none' | 'unknown' | 'charging' | 'full' | 'plugged' | 'discharging'
//   transition(prev, next) -> the toast to show, if any:
//     { kind: 'charging' | 'battery' | 'low' | 'full' } | null
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).Battery = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const LOW = 20;
  const CRITICAL = 10;

  // raw = { present: bool, ac: bool | null, charging: bool, pct: 0-100 | -1, saver: bool, minutes: n | -1 }
  function view(raw) {
    if (!raw || typeof raw !== 'object' || raw.present === false) return { present: false, state: 'none', pct: -1, low: false, critical: false, saver: false, minutes: -1 };
    const pct = Number.isInteger(raw.pct) && raw.pct >= 0 && raw.pct <= 100 ? raw.pct : -1;
    const ac = raw.ac === true ? true : raw.ac === false ? false : null;
    const charging = raw.charging === true;
    let state = 'unknown';
    if (pct >= 0 && ac !== null) {
      if (!ac) state = 'discharging';
      else if (charging) state = pct >= 100 ? 'full' : 'charging';
      else state = pct >= 100 ? 'full' : 'plugged';
    }
    const minutes = Number.isInteger(raw.minutes) && raw.minutes >= 0 ? raw.minutes : -1;
    return {
      present: true, state, pct,
      low: state === 'discharging' && pct >= 0 && pct <= LOW,
      critical: state === 'discharging' && pct >= 0 && pct <= CRITICAL,
      saver: raw.saver === true, minutes,
    };
  }

  // Which change deserves a toast: plugged in / unplugged, battery getting low, charge complete.
  // The first reading after start (prev null) is never news.
  function transition(prev, next) {
    if (!prev || !next || !next.present || next.state === 'unknown' || prev.state === 'unknown') return null;
    const wasAc = prev.state !== 'discharging';
    const isAc = next.state !== 'discharging';
    if (!wasAc && isAc) return { kind: 'charging' };
    if (wasAc && !isAc) return { kind: next.low ? 'low' : 'battery' };
    if (!isAc && next.low && !prev.low) return { kind: 'low' };
    if (!isAc && next.critical && !prev.critical) return { kind: 'low' };
    if (isAc && next.state === 'full' && prev.state === 'charging') return { kind: 'full' };
    return null;
  }

  // "2 h 05 min" style remaining-time label pieces (the renderer translates them)
  function hm(minutes) {
    if (!Number.isInteger(minutes) || minutes < 0) return null;
    return { h: Math.floor(minutes / 60), m: minutes % 60 };
  }

  return { LOW, CRITICAL, view, transition, hm };
});
