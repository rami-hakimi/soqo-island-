// Focus Mode view. It never owns the timer: main relays the island's snapshots (total, remaining,
// endAt, running, phase) and every button sends a command back to the island's timer.
const $ = (s) => document.querySelector(s);
const api = window.focusMode;
let I18N = I18n.create(api.i18n);
const t = (key, params) => I18N.t(key, params);
I18n.applyDom(I18N);
document.title = t('fm.title');

const fm = $('#fm');
let tm = { total: 0, remaining: 0, endAt: 0, running: false, phase: null, round: 0 };
let doneAt = 0; // a plain timer reached zero: show "Done" for a moment, then the presets

const fmt = (sec) => {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

const remaining = () => (tm.running ? Math.max(0, (tm.endAt - Date.now()) / 1000) : tm.remaining);

function draw() {
  const rem = remaining();
  const set = tm.total > 0 && (rem > 0 || tm.running);
  const started = tm.remaining > 0 && tm.remaining < tm.total;
  fm.dataset.phase = set ? tm.phase || '' : '';
  fm.classList.toggle('paused', set && !tm.running);
  fm.classList.toggle('idle', !set && !doneAt);
  fm.classList.toggle('done', !!doneAt);
  $('#digits').textContent = doneAt ? '0:00' : fmt(Math.ceil(rem));
  $('#label').textContent = set
    ? (tm.phase === 'focus' ? t('timer.focusN', { n: (tm.round || 0) + 1 }) : tm.phase === 'break' ? t('timer.break') : t('fm.timer'))
    : doneAt ? t('fm.done') : t('fm.noTimer');
  $('#status').textContent = set ? (tm.running ? '' : t('timer.paused')) : '';
  $('#bar').style.width = set && tm.total ? `${Math.round((1 - rem / tm.total) * 100)}%` : '0%';
  $('#toggle-text').textContent = tm.running ? t('timer.pause') : started || rem > 0 ? t('timer.resume') : t('timer.start');
  $('#toggle').setAttribute('aria-label', $('#toggle-text').textContent);
  $('#controls').hidden = !set;
  $('#presets').hidden = set || !!doneAt;
}

api.onTimer((snap) => {
  const was = tm;
  tm = { ...tm, ...(snap || {}) };
  // a plain timer that just ended: the island shows its toast; here a short "Done" before the presets
  if (was.total > 0 && !tm.total && !tm.phase) {
    doneAt = Date.now();
    setTimeout(() => { doneAt = 0; draw(); }, 3500);
  } else if (tm.total > 0) doneAt = 0; // a new timer replaces the "Done" card at once
  draw();
});
api.timer().then((snap) => { if (snap) { tm = { ...tm, ...snap }; } draw(); });
setInterval(() => { if (tm.running) draw(); }, 250);

$('#toggle').addEventListener('click', () => api.cmd('toggle'));
$('#cancel').addEventListener('click', () => api.cmd('cancel'));
$('#exit').addEventListener('click', () => api.cmd('exit'));
$('#session').addEventListener('click', () => api.cmd('session'));
document.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => api.cmd({ start: Number(b.dataset.min) })));

// Esc leaves the view (the timer keeps running); Space pauses / resumes a set timer
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    api.cmd('exit');
  } else if (e.key === ' ' && !$('#controls').hidden && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    api.cmd('toggle');
  }
});

api.onI18n((payload) => {
  I18N = I18n.create(payload);
  I18n.applyDom(I18N);
  document.title = t('fm.title');
  draw();
});
draw();
