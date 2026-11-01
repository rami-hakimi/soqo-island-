// The companion: notices when you come back, greets the day, and minds your breaks.
//   - back after 5+ min away: "Welcome back" with what happened meanwhile (downloads, adhan,
//     meetings, internet) — only when something did, or after a long absence
//   - first time at the computer each day: a morning (or evening) card: weather, next prayer,
//     today's meetings, Hijri date
//   - 50 min of continuous use: a gentle break card (stand up / water / rest your eyes)
// Idle time comes from the bridge (Windows' last-input time) with every media update.
(() => {
  const AWAY_S = 5 * 60; // this long without input = away
  const LONG_AWAY_MS = 30 * 60e3;
  const WORK_MS = 50 * 60e3;
  const BRIEF_KEY = movedKey('soqo-brief-day', 'nova-brief-day');
  const CARE = [['care.move', 'care.moveText'], ['care.eyes', 'care.eyesText'], ['care.breathe', 'care.breatheText']];

  let awayFrom = 0; // when the current absence started
  let activeSince = Date.now();
  let careIdx = 0;
  let pending = null; // a card waiting for a calm moment

  const today = () => new Date().toDateString();
  const briefDone = () => { try { return localStorage.getItem(BRIEF_KEY) === today(); } catch { return false; } };
  const markBrief = () => { try { localStorage.setItem(BRIEF_KEY, today()); } catch {} };
  const mins = (ms) => {
    const m = Math.round(ms / 60000);
    if (m < 60) return t('dur.min', { m });
    return m % 60 ? t('dur.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('dur.h', { h: Math.floor(m / 60) });
  };
  const line = (icon, html) => `<span class="ln">${icon} ${html}</span>`;
  // Arabic words (prayer names, Hijri date) keep their own direction inside the English lines
  const ar = (t) => `<bdi lang="ar">${t}</bdi>`;

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? t('greet.morning') : h < 17 ? t('greet.afternoon') : t('greet.evening');
  }

  async function brief() {
    markBrief();
    const lines = [];
    const now = new Date();
    const date = now.toLocaleDateString(LOCALE() || 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    const hijri = $('#pr-hijri')?.textContent || '';
    lines.push(line('📆', `<b>${esc(date)}</b>${hijri ? ` · ${ar(esc(hijri))}` : ''}`));
    try {
      const w = (await bridge.system.snapshot())?.weather;
      if (w) lines.push(line('🌤️', t('brief.weather', { temp: w.temp, city: esc(w.city || t('brief.yourCity')), hi: w.hi, lo: w.lo })));
    } catch {}
    const pr = window.nextPrayerText?.();
    if (pr && feat('tabPrayer')) {
      const [name, ...time] = pr.split(' ');
      lines.push(line('🕌', t('brief.nextPrayer', { name: ar(esc(name)), time: esc(time.join(' ')) })));
    }
    const meets = window.meetingsToday?.() || [];
    if (meets.length) {
      const first = meets[0];
      const at = new Date(first.start).toLocaleTimeString(LOCALE(), { hour: 'numeric', minute: '2-digit' });
      lines.push(line('📅', t('brief.meetings', { count: meets.length, title: esc(first.title), time: at })));
    }
    queue({ kind: 'brief', badge: greeting(), html: `<span class="big">${greeting()} 👋</span>${lines.join('')}`, ref: '', ms: 14000 });
  }

  function welcome(awayMs) {
    const since = Date.now() - awayMs;
    const news = happenings.filter((h) => h.at >= since);
    if (!news.length && awayMs < LONG_AWAY_MS) return;
    const lines = news.slice(-4).map((h) => line(h.icon, esc(h.text)));
    if (news.length > 4) lines.push(line('…', t('welcome.more', { n: news.length - 4 })));
    if (!lines.length) lines.push(line('☕', t('welcome.quiet')));
    queue({ kind: 'welcome', badge: t('welcome.title'), html: `<span class="big">${t('welcome.title')} 👋</span><span class="ln">${t('welcome.away', { dur: mins(awayMs) })}</span>${lines.join('')}`, ref: '', ms: 12000 });
  }

  function care() {
    const [title, text] = CARE[careIdx++ % CARE.length];
    queue({ kind: 'care', badge: t('care.badge'), html: `<span class="big">${t(title)} 🌿</span><span class="ln">${t(text)}</span>`, ref: '', ms: 15000 });
  }

  // cards wait while the island is open, hidden, showing another card or a toast
  function queue(card) { pending = card; flush(); }
  function flush() {
    if (!pending) return;
    const now = Date.now();
    if (!state.visible || lastMode === 'expanded' || cardShowing() || window.sceneShowing?.() || (state.toast && now < state.toastUntil)) return;
    const c = pending;
    pending = null;
    showCard(c);
    window.soqi?.react(c.kind === 'care' ? 'curious' : 'happy', c.ms);
  }
  setInterval(flush, 1000);

  bridge.onMedia((m) => {
    if (typeof m.idle !== 'number') return;
    const now = Date.now();
    if (m.idle >= AWAY_S) {
      if (!awayFrom) awayFrom = now - m.idle * 1000;
      return;
    }
    if (awayFrom && m.idle < 5) {
      // back at the computer
      const awayMs = now - awayFrom;
      awayFrom = 0;
      activeSince = now; // that was a real break
      if (feat('morningBrief') && !briefDone() && new Date().getHours() >= 4) brief();
      else if (feat('welcomeBack')) welcome(awayMs);
      return;
    }
    // minding breaks: long continuous use, never during focus, quiet hours or fullscreen
    if (feat('wellbeing') && now - activeSince >= WORK_MS && state.visible && !focusing()) {
      activeSince = now;
      care();
    }
  });

  // first start of the day (the PC was just switched on): greet once the island is settled
  setTimeout(() => {
    if (feat('morningBrief') && !briefDone() && new Date().getHours() >= 4) brief();
  }, 9000);

  // Fresh installation: a short, neutral welcome (music, downloads, apps, shelf, alerts) with a
  // way into Settings. Nothing religious: Islamic features are opt-in under Settings › Features.
  async function onboarding() {
    try {
      const o = await bridge.onboarding();
      if (!o?.pending) return;
    } catch { return; }
    const shown = window.playScene?.({
      mood: 'happy', tone: 'water', badge: t('onboarding.badge'), lang: I18N.lang,
      title: t('onboarding.title'), sub: t('onboarding.sub'), ms: 45000,
      button: { label: t('onboarding.settings'), onClick: () => { bridge.onboardingDone(); bridge.openSettings(); } },
      button2: { label: t('onboarding.later'), onClick: () => bridge.onboardingDone() },
      onClose: () => bridge.onboardingDone(),
    });
    if (!shown) bridge.onboardingDone();
  }
  setTimeout(onboarding, 4000);

  // Imported from Nova Island with the prayer features at their defaults: ask once whether to
  // keep them. They stay on until answered; closing the card asks again next start.
  let asked = false;
  function askIslamic() {
    if (asked || !state.features.islamicPrompt) return;
    asked = true;
    const decide = (on) => bridge.setFeatures({ islamic: on, islamicPrompt: false });
    const shown = window.playScene?.({
      mood: 'curious', tone: 'gold', badge: t('islamicPrompt.badge'), lang: I18N.lang,
      title: t('islamicPrompt.title'), sub: t('islamicPrompt.sub'), ms: 120000,
      button: { label: t('islamicPrompt.keep'), onClick: () => decide(true) },
      button2: { label: t('islamicPrompt.off'), onClick: () => decide(false) },
      onClose: () => { asked = false; },
    });
    if (!shown) asked = false;
  }
  // the first features event can arrive before this script runs (the parser yields between
  // scripts), so also check once after the island has settled
  window.addEventListener('island:features', () => setTimeout(askIslamic, 2500));
  setTimeout(askIslamic, 3500);
})();
