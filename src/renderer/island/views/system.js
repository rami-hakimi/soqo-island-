// System tab: weather (also in the header) with its data credit, CPU / memory meters, battery,
// clipboard history.
(() => {
  const CLOUD = '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>';
  const CLOUD_TOP = '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/>';
  const WX = {
    sun: { label: 'weather.clear', svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>' },
    moon: { label: 'weather.clear', svg: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' },
    partly: { label: 'weather.partly', svg: '<path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M19.1 4.9l-1.4 1.4M15.95 12.65a4 4 0 0 0-5.93-4.13"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>' },
    cloud: { label: 'weather.cloudy', svg: CLOUD },
    fog: { label: 'weather.fog', svg: `${CLOUD_TOP}<path d="M16 17H7M17 21H9"/>` },
    rain: { label: 'weather.rain', svg: `${CLOUD_TOP}<path d="M16 14v6M8 14v6M12 16v6"/>` },
    snow: { label: 'weather.snow', svg: `${CLOUD_TOP}<path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>` },
    storm: { label: 'weather.storm', svg: '<path d="M6 16.33A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.97"/><path d="m13 12-3 5h4l-3 5"/>' },
  };

  function wxKind(code, isDay) {
    if (code === 0) return isDay ? 'sun' : 'moon';
    if (code <= 2) return isDay ? 'partly' : 'cloud';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }

  let lastWeather = null;
  function renderWeather(w) {
    if (!w) return;
    lastWeather = w;
    const kind = wxKind(w.code, w.isDay);
    const info = { svg: WX[kind].svg, label: t(WX[kind].label) };
    const card = $('#wx-card');
    card.classList.toggle('night', !w.isDay);
    card.classList.toggle('cloudy', ['cloud', 'fog', 'rain', 'snow', 'storm'].includes(kind));
    $('#wx-ico').innerHTML = info.svg;
    $('#wx-temp').textContent = `${w.temp}°`;
    $('#wx-desc').textContent = info.label;
    $('#wx-meta').textContent = `${w.city ? `${w.city} · ` : ''}${t('weather.hiLo', { hi: w.hi, lo: w.lo })}`;
    const mini = $('#wx-mini');
    mini.hidden = false;
    mini.querySelector('svg').innerHTML = info.svg;
    mini.querySelector('b').textContent = `${w.temp}°`;
    mini.title = w.city ? t('weather.inCity', { label: info.label, city: w.city }) : info.label;
    for (const pill of [$('#i-wx'), $('#v-wx')]) {
      pill.hidden = false;
      pill.querySelector('svg').innerHTML = info.svg;
      pill.querySelector('b').textContent = `${w.temp}°`;
    }
  }

  // ---- data credit: a small visible link (Open-Meteo asks for one next to its data) and an
  // info button that opens a popover with the provider, the licence and the city-search source.
  // The popover lives inside the island, closes on Escape, on a click elsewhere, when the
  // island collapses, and never covers anything outside the island.
  const pop = $('#wx-pop');
  const infoBtn = $('#wx-info');
  function openPop(on) {
    const want = on ?? pop.hidden;
    pop.hidden = !want;
    infoBtn.setAttribute('aria-expanded', String(want));
    if (want) pop.querySelector('button, [tabindex]')?.focus({ preventScroll: true });
    else if (document.activeElement && pop.contains(document.activeElement)) infoBtn.focus({ preventScroll: true });
  }
  infoBtn.addEventListener('click', (e) => { e.stopPropagation(); openPop(); });
  $('#wx-src').addEventListener('click', (e) => { e.stopPropagation(); bridge.openSupport('openmeteo'); });
  pop.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('[data-support]');
    if (b) bridge.openSupport(b.dataset.support);
    if (e.target.closest('#wx-pop-close')) openPop(false);
  });
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); openPop(false); } });
  infoBtn.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) openPop(false); });
  document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== infoBtn) openPop(false); });
  window.addEventListener('island:mode', (e) => { if (e.detail.mode !== 'expanded' && !pop.hidden) openPop(false); });
  window.addEventListener('blur', () => { if (!pop.hidden) openPop(false); });

  function meter(bar, val, v) {
    const pct = Math.round(v * 100);
    bar.style.width = `${pct}%`;
    bar.classList.toggle('warn', v >= 0.7 && v < 0.9);
    bar.classList.toggle('hot', v >= 0.9);
    val.textContent = `${pct}%`;
  }

  bridge.onStats((s) => {
    meter($('#cpu-bar'), $('#cpu-val'), s.cpu);
    meter($('#ram-bar'), $('#ram-val'), s.ram);
    $('#ram-val').title = `${(s.ramUsed / 2 ** 30).toFixed(1)} / ${(s.ramTotal / 2 ** 30).toFixed(1)} GB`;
  });

  // ---- battery: what Windows reports through the helper (shared/battery.js); the row is
  // omitted on a PC without a battery, and a reading that is unknown says so
  let batt = null; // last view
  const row = $('#batt-row');
  function stateText(v) {
    if (v.state === 'unknown') return t('battery.unknown');
    if (v.state === 'charging') return t('battery.chargingState');
    if (v.state === 'full') return t('battery.full');
    if (v.state === 'plugged') return t('battery.plugged');
    if (v.critical) return t('battery.critical');
    if (v.low) return t('battery.lowState');
    const left = Battery.hm(v.minutes);
    return left ? t(left.h ? 'battery.leftHM' : 'battery.leftM', left) : t('battery.onBatteryState');
  }
  function renderBattery(v) {
    row.hidden = !v || !v.present;
    if (!v || !v.present) return;
    row.classList.toggle('charging', v.state === 'charging' || v.state === 'full');
    row.classList.toggle('low', v.low);
    row.classList.toggle('critical', v.critical);
    row.classList.toggle('unknown', v.state === 'unknown');
    $('#batt-val').textContent = v.pct >= 0 ? `${v.pct}%` : '—';
    $('#batt-state').textContent = stateText(v);
    const fill = $('#batt-bar');
    fill.style.width = `${v.pct >= 0 ? v.pct : 0}%`;
    $('#batt-fill').style.width = `${v.pct >= 0 ? v.pct : 0}%`;
    row.setAttribute('aria-label', `${t('sys.battery')}: ${v.pct >= 0 ? `${v.pct}%` : t('battery.unknown')} · ${stateText(v)}`);
  }
  bridge.onBattery((raw) => {
    const v = Battery.view(raw);
    const change = Battery.transition(batt, v);
    batt = v;
    renderBattery(v);
    if (!change || !feat('battery')) return;
    const pct = v.pct >= 0 ? `${v.pct}%` : '';
    const level = v.pct >= 0 ? v.pct / 100 : 0;
    if (change.kind === 'charging') showToast('charging', t('battery.charging'), pct, level);
    else if (change.kind === 'full') showToast('charging', t('battery.full'), pct, level);
    else if (change.kind === 'battery') showToast('battery', t('battery.onBattery'), pct, level);
    else if (change.kind === 'low') {
      showToast('low', v.critical ? t('battery.critical') : t('battery.low'), pct, level, 4500);
      window.soqi?.react('warning');
    }
  });

  const clipList = $('#clip-list');
  let lastClips = [];
  function renderClips(clips) {
    lastClips = clips;
    clipList.innerHTML = '';
    if (!clips.length) {
      clipList.innerHTML = `<div class="clip-empty">${esc(t('clips.empty'))}</div>`;
      return;
    }
    clips.forEach((text, i) => {
      const b = document.createElement('button');
      b.className = 'clip-item';
      b.dir = 'auto';
      b.title = t('clips.copy');
      b.textContent = text.replace(/\s+/g, ' ').trim();
      b.addEventListener('click', () => {
        bridge.system.copyClip(i);
        b.classList.add('copied');
      });
      clipList.append(b);
    });
  }
  $('#clip-clear').addEventListener('click', () => bridge.system.clearClips());

  window.addEventListener('island:i18n', () => { renderWeather(lastWeather); renderClips(lastClips); renderBattery(batt); });
  bridge.onWeather(renderWeather);
  bridge.onClipboard(renderClips);
  bridge.system.snapshot().then((s) => {
    renderClips(s.clips);
    renderWeather(s.weather);
  });
})();
