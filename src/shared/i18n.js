// Translation core shared by the main process (CommonJS) and the renderers (classic script).
//   const i18n = I18n.create({ lang: 'ar', dict, fallback });
//   i18n.t('apps.count', { n: 3, max: 12 })       -> "3/12 · Click to open"
//   i18n.t('shelf.count', { n: 1 })               -> picks shelf.count_one / _other (Intl.PluralRules)
//   i18n.dir                                      -> 'rtl' | 'ltr'
//   i18n.locale                                   -> BCP-47 tag for Intl formatting (Arabic with Latin digits)
//   I18n.applyDom(i18n, root)                     -> fills data-i18n / -title / -placeholder / -aria / -html
// Missing keys fall back to English, then to the key itself (never to an empty string).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).I18n = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const RTL = new Set(['ar', 'he', 'fa', 'ur']);
  const PLURALS = ['zero', 'one', 'two', 'few', 'many', 'other'];

  function interpolate(text, params) {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
  }

  function create({ lang = 'en', dict = {}, fallback = {} }) {
    const short = String(lang).toLowerCase().split('-')[0];
    let rules = null;
    try { rules = new Intl.PluralRules(short); } catch { rules = null; }
    const lookup = (key) => (key in dict ? dict[key] : key in fallback ? fallback[key] : undefined);

    function t(key, params) {
      let text = lookup(key);
      if (params && typeof params.count === 'number') {
        const cat = rules ? rules.select(params.count) : params.count === 1 ? 'one' : 'other';
        text = lookup(`${key}_${cat}`) ?? lookup(`${key}_other`) ?? text;
        params = { n: params.count, ...params };
      }
      if (text === undefined) return key;
      return interpolate(text, params);
    }
    const has = (key) => lookup(key) !== undefined || PLURALS.some((p) => lookup(`${key}_${p}`) !== undefined);

    return {
      lang: short,
      dir: RTL.has(short) ? 'rtl' : 'ltr',
      // Arabic UI keeps Latin digits so numbers read the same everywhere in the island;
      // Dutch formats dates and times the Netherlands way; English follows the system locale
      locale: short === 'ar' ? 'ar-u-nu-latn' : short === 'nl' ? 'nl-NL' : undefined,
      t,
      has,
    };
  }

  // Static text in a page: <span data-i18n="key">, data-i18n-title, data-i18n-placeholder,
  // data-i18n-aria (aria-label), data-i18n-html (trusted dictionary markup only).
  function applyDom(i18n, root) {
    const doc = root || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    for (const el of doc.querySelectorAll('[data-i18n]')) el.textContent = i18n.t(el.dataset.i18n);
    for (const el of doc.querySelectorAll('[data-i18n-html]')) el.innerHTML = i18n.t(el.dataset.i18nHtml);
    for (const el of doc.querySelectorAll('[data-i18n-title]')) el.title = i18n.t(el.dataset.i18nTitle);
    for (const el of doc.querySelectorAll('[data-i18n-placeholder]')) el.setAttribute('placeholder', i18n.t(el.dataset.i18nPlaceholder));
    for (const el of doc.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', i18n.t(el.dataset.i18nAria));
    const html = doc.documentElement || (doc.ownerDocument && doc.ownerDocument.documentElement);
    if (html) {
      html.lang = i18n.lang;
      html.dir = i18n.dir;
    }
  }

  return { create, applyDom, interpolate, RTL };
});
