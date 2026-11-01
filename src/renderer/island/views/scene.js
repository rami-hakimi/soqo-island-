// Scenes: for a moment the island turns into a small glass porthole with Soqi inside and a card
// beside it — the adhan, a glass of water, a focus session. The island's own morph (size and
// place) does the transformation; Soqi and the card fade in after it.
//
//   playScene({ mood: a Soqi state ('happy', 'notification', 'listening', 'excited', ...),
//               tone: 'gold' | 'water' | 'focus',
//               badge, title, quran, sub (html), button: { label, onClick }, ms,
//               lang: 'ar' (right-to-left card; English otherwise),
//               onClose (closed with × or timed out, not by the button) })
(() => {
  const card = $('#scene-card');
  const bar = $('.sc-bar b');
  const pic = $('#sc-img');
  let total = 0;
  let current = null;
  let lastTick = Date.now();

  function classes(on, s) {
    island.classList.toggle('glow-gold', on && s.tone === 'gold');
  }

  function end(how = 'closed') {
    if (!current) return;
    if (how !== 'button') current.onClose?.();
    state.sceneUntil = 0;
    card.classList.remove('on');
    render();
    const s = current;
    current = null;
    // let the island morph back before the glow goes
    setTimeout(() => { if (!current) classes(false, s); }, 420);
  }

  window.playScene = (s) => {
    if (anchor.vertical) return false; // no room beside a side-docked island
    current = s;
    classes(true, s);
    const mood = SoqiState.STATES.includes(s.mood) ? s.mood : 'happy';
    pic.src = `../../../assets/soqi/${mood}.png`;
    pic.dataset.mood = mood;
    card.className = `scene-card ${s.tone || 'gold'}`;
    card.lang = s.lang || 'en';
    card.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    $('#sc-badge').textContent = s.badge || '';
    const title = $('#sc-title');
    title.textContent = s.title || '';
    title.classList.toggle('quran', !!s.quran);
    $('#sc-sub').innerHTML = s.sub || '';
    const btn = $('#sc-btn');
    btn.hidden = !s.button;
    if (s.button) btn.textContent = s.button.label;
    total = s.ms || 30000;
    state.sceneUntil = Date.now() + total;
    bar.style.width = '100%';
    state.hover = false;
    render();
    positionIsland();
    requestAnimationFrame(() => card.classList.add('on'));
    return true;
  };
  window.sceneShowing = () => !!current;
  window.endScene = end;

  $('#sc-close').addEventListener('click', (e) => { e.stopPropagation(); end(); });
  $('#sc-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const fn = current?.button?.onClick;
    end('button');
    fn?.();
  });

  // countdown (paused while the mouse is on it)
  setInterval(() => {
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;
    if (!current) return;
    if (state.hover) state.sceneUntil += dt;
    if (now >= state.sceneUntil) return end();
    bar.style.width = `${Math.max(0, (state.sceneUntil - now) / total) * 100}%`;
  }, 250);
})();
