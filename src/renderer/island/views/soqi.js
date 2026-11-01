// Soqi, the island's dolphin. One sprite (#soqi) peeks over the island's edge: when the cursor
// lingers nearby (curious, leaning toward it), while music plays (bobbing), when something
// happens (a download finished, a warning, a notification), while the island is open (the
// current mood), and asleep when you have been away. The mood itself comes from
// shared/soqi-state.js; views call window.soqi.react(state) on real events.
// Everything is optional (Settings > Companion) and still with reduced motion.
(() => {
  const DWELL_MS = 3000; // cursor beside the island this long before Soqi looks
  const machine = SoqiState.createMachine();
  const img = $('#soqi');
  const sprites = {};
  for (const s of SoqiState.STATES) {
    const i = new Image();
    i.src = `../../../assets/soqi/${s}.png`;
    sprites[s] = i;
  }

  let near = null;
  let nearSince = 0;
  let dwellTimer = null;
  let shown = '';

  const reactsOn = () => feat('soqiReacts');
  const peekOn = () => feat('soqiEyes');

  // Is there a reason for Soqi to be out right now?
  function visible() {
    if (!feat('companion') || anchor.vertical || anchor.addr || state.moving || !state.visible) return false;
    if (lastMode === 'scene' || lastMode === 'peek') return false;
    // never beside a dhikr / du'a / Qur'an card; the companion's own cards (welcome, brief, break) are hers
    if (lastMode === 'reminder') return reactsOn() && machine.reacting() && /\b(welcome|brief|care)\b/.test($('.l-reminder').className);
    if (lastMode === 'expanded') return reactsOn();
    if (reactsOn() && machine.reacting()) return true;
    if (reactsOn() && machine.context().away) return true;
    if (lastMode === 'compact' && reactsOn() && compactKind() === 'media') return true;
    if (lastMode === 'idle' && peekOn() && near && Date.now() - nearSince >= DWELL_MS && !state.hover) return true;
    return false;
  }

  function apply() {
    const on = visible();
    const mood = machine.current();
    if (mood !== shown) {
      shown = mood;
      img.src = sprites[mood].src;
      img.dataset.mood = mood;
    }
    island.classList.toggle('soqi-show', on);
    // no room above an island at the top of the screen: Soqi appears beside its end instead
    island.classList.toggle('soqi-side', !!anchor.docked || anchor.y < 40);
    island.classList.toggle('soqi-still', !feat('soqiMotion'));
    // lean a little toward the cursor while curious
    if (on && near && mood === 'curious') {
      const lean = Math.max(-1, Math.min(1, near.dx / 160));
      img.style.setProperty('--lean', `${(lean * 7).toFixed(1)}deg`);
      img.style.setProperty('--shift', `${(lean * 4).toFixed(1)}px`);
    } else {
      img.style.removeProperty('--lean');
      img.style.removeProperty('--shift');
    }
  }

  // ---- public API for the other views ----
  window.soqi = {
    react(mood, ms) {
      if (!reactsOn()) return false;
      const ok = machine.react(mood, ms);
      if (ok) {
        apply();
        setTimeout(apply, (ms > 0 ? ms : SoqiState.DEFAULT_MS[mood]) + 60);
      }
      return ok;
    },
    set(key, value) {
      machine.set(key, value);
      apply();
    },
    mood: () => machine.current(),
  };

  // ---- cursor nearby (main sends the vector while the cursor is within reach) ----
  bridge.onNear((n) => {
    if (!n) {
      near = null;
      nearSince = 0;
      clearTimeout(dwellTimer);
      machine.set('near', false);
      apply();
      return;
    }
    if (!near) {
      nearSince = Date.now();
      clearTimeout(dwellTimer);
      dwellTimer = setTimeout(() => { machine.set('near', true); apply(); }, DWELL_MS + 20);
    }
    near = n;
    apply();
  });

  // ---- music and presence come with every bridge update ----
  bridge.onMedia((m) => {
    if (m.error) return;
    machine.set('hasMedia', !!m.has);
    machine.set('playing', !!m.has && !!m.playing);
    if (typeof m.idle === 'number') machine.set('away', m.idle >= 5 * 60);
    apply();
  });

  bridge.onHover(apply);
  bridge.onVisibility(apply);
  window.addEventListener('island:features', apply);
  window.addEventListener('island:mode', apply);
  setInterval(apply, 1000); // reactions ending, dwell passing
  apply();
})();
