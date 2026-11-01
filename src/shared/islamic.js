// Islamic features are optional and off for new installations. One master switch (`islamic`)
// gates every prayer / dhikr / Qur'an switch below; the individual switches keep their own
// values so turning the master back on restores the user's previous choices.
// Shared by main (CommonJS), the renderers (classic script) and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).Islamic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // switches that only mean something while the master is on
  const KEYS = ['tabPrayer', 'slidePrayer', 'prayerAlerts', 'adhanSound', 'soqiPrayer', 'reminders', 'remindAyah', 'remindDhikr', 'remindDua'];
  // the three a Nova Island user would have turned off to stop seeing the features
  const SIGNALS = ['tabPrayer', 'prayerAlerts', 'reminders'];

  // `features[key] !== false`, except that an Islamic switch reads as off while the master is off
  function isOn(features, key) {
    const f = features || {};
    if (KEYS.includes(key) && f.islamic === false) return false;
    return f[key] !== false;
  }

  // What a profile imported from Nova Island means. Nova had no master switch and everything
  // on by default, so:
  //   - every signal explicitly off      -> the user had turned the features off: islamic off
  //   - some signal explicitly set       -> they used and tuned them: keep on, no question
  //   - nothing explicit (all defaults)  -> ambiguous: keep on for now and ask once
  function fromNova(old) {
    const o = old || {};
    const explicit = SIGNALS.filter((k) => typeof o[k] === 'boolean');
    if (explicit.length === SIGNALS.length && explicit.every((k) => o[k] === false)) return { islamic: false, prompt: false };
    if (explicit.length) return { islamic: true, prompt: false };
    return { islamic: true, prompt: true };
  }

  return { KEYS, SIGNALS, isOn, fromNova };
});
