// Activity tab: coding-agent sessions (Claude Code, Codex CLI) and recent notifications, most
// important first. Alerts: an approval request is a prominent toast (and, if the user chose so,
// opens the island on this tab for a moment); a finished or failed turn is a short toast that
// takes no focus; a Windows notification is a short toast too. Clicking an agent row brings its
// terminal window to the front; the approval itself is always given there, never here.
(() => {
  const list = $('#act-agents');
  const recentEl = $('#act-recent');
  const badge = $('#act-badge');
  let agents = { enabled: false, sessions: [] };
  let notif = { enabled: false, access: 'off', quiet: false, preview: true, items: [] };
  const recent = []; // { at, kind: 'agent' | 'notif' | 'note', icon, title, text, key?, id? }
  const MAX_RECENT = 30;

  const STATUS_KEY = { attention: 'act.attention', error: 'act.error', working: 'act.working', done: 'act.done', idle: 'act.idle', ended: 'act.ended' };
  const AGENT_ICON = {
    claude: '<svg class="s" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l6-5-6-5M12 19h8"/></svg>',
    codex: '<svg class="s" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 10l2 2-2 2M12 14h4"/></svg>',
  };

  const ago = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 45) return t('act.justNow');
    const m = Math.round(s / 60);
    if (m < 60) return t('act.minAgo', { m });
    const h = Math.floor(m / 60);
    return t('act.hAgo', { h, m: m % 60 });
  };
  const timeOf = (at) => new Date(at).toLocaleTimeString(LOCALE(), { hour: 'numeric', minute: '2-digit' });

  function sessionLine(s) {
    if (s.status === 'attention' && s.pending) return s.pending.kind === 'question' ? t('act.question') : (s.pending.summary || s.pending.message || t('act.needsApproval'));
    if (s.status === 'working') return s.activity || t('act.workingOn');
    if (s.status === 'error') return s.activity || t('act.error');
    return t(STATUS_KEY[s.status] || 'act.idle');
  }

  function renderAgents() {
    list.innerHTML = '';
    const sessions = agents.sessions || [];
    const attention = sessions.filter((s) => s.status === 'attention').length;
    badge.classList.toggle('on', attention > 0);
    badge.setAttribute('aria-label', attention ? t('act.badge', { n: attention }) : '');
    $('#act-agents-sub').textContent = !agents.enabled ? t('act.off') : sessions.length ? t('act.sessions', { count: sessions.length, n: sessions.length }) : '';
    if (!agents.enabled) {
      const e = document.createElement('div');
      e.className = 'act-empty';
      e.textContent = t('act.enableHint');
      list.append(e);
      return;
    }
    if (!sessions.length) {
      const e = document.createElement('div');
      e.className = 'act-empty';
      e.textContent = t('act.noSessions');
      list.append(e);
      return;
    }
    for (const s of sessions) {
      const row = document.createElement('button');
      row.className = `act-row agent st-${s.status}`;
      row.setAttribute('role', 'listitem');
      row.dataset.key = s.key;
      row.title = s.canOpen ? t('act.openTerminal', { terminal: s.terminal || t('act.terminal') }) : t('act.noTerminal');
      row.innerHTML = `<span class="act-ico">${AGENT_ICON[s.agent] || ''}<i class="act-dot"></i></span><span class="act-main"><b class="act-title" dir="auto"></b><span class="act-sub" dir="auto"></span></span><span class="act-meta"><span class="act-time"></span><span class="act-state"></span></span>`;
      row.querySelector('.act-title').textContent = s.project ? `${s.short || s.name} · ${s.project}` : s.name;
      row.querySelector('.act-sub').textContent = sessionLine(s);
      row.querySelector('.act-time').textContent = ago(Date.now() - s.at);
      row.querySelector('.act-state').textContent = t(STATUS_KEY[s.status] || 'act.idle');
      row.addEventListener('click', (e) => { e.stopPropagation(); if (s.canOpen) bridge.agents.open(s.key); });
      list.append(row);
    }
  }

  function renderRecent() {
    recentEl.innerHTML = '';
    const items = [...recent].sort((a, b) => b.at - a.at).slice(0, MAX_RECENT);
    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'act-empty';
      e.textContent = notif.enabled ? t('act.noRecent') : t('act.recentHint');
      recentEl.append(e);
      return;
    }
    for (const it of items) {
      const row = document.createElement(it.kind === 'notif' && it.proc ? 'button' : 'div');
      row.className = `act-row recent ${it.kind}`;
      row.setAttribute('role', 'listitem');
      if (row.tagName === 'BUTTON') row.title = t('act.openApp', { app: it.app });
      row.innerHTML = `<span class="act-ico"></span><span class="act-main"><b class="act-title" dir="auto"></b><span class="act-sub" dir="auto"></span></span><span class="act-meta"><span class="act-time"></span></span>`;
      row.querySelector('.act-ico').textContent = it.icon || '•';
      row.querySelector('.act-title').textContent = it.title;
      row.querySelector('.act-sub').textContent = it.text || '';
      row.querySelector('.act-sub').hidden = !it.text;
      row.querySelector('.act-time').textContent = timeOf(it.at);
      if (it.kind === 'notif' && it.proc) row.addEventListener('click', (e) => { e.stopPropagation(); bridge.notif.open(it.id); });
      recentEl.append(row);
    }
  }

  function remember(entry) {
    recent.push(entry);
    while (recent.length > MAX_RECENT) recent.shift();
    renderRecent();
  }

  // Soqo's own happenings (downloads, network, meetings) join the list
  let notedCount = 0;
  function pullNotes() {
    while (notedCount < happenings.length) {
      const h = happenings[notedCount++];
      recent.push({ at: h.at, kind: 'note', icon: h.icon, title: h.text, text: '' });
    }
    while (recent.length > MAX_RECENT) recent.shift();
  }

  // --- alerts ---
  let expandTimer = null;
  function agentAlert({ kind, session: s }) {
    if (!s || !feat('agents')) return;
    const title = s.project ? `${s.short || s.name} · ${s.project}` : s.name;
    const open = s.canOpen ? () => bridge.agents.open(s.key) : () => { state.pinned = true; selectTab('activity'); render(); };
    if (kind === 'approval' || kind === 'question') {
      const ms = Math.max(5, Math.min(120, state.features.agentAlertSec || 15)) * 1000;
      showToast('agent-ask', title, kind === 'question' ? t('act.asksYou') : t('act.needsApproval'), 0, ms);
      state.toastAction = open;
      island.classList.add('agent-flash');
      setTimeout(() => island.classList.remove('agent-flash'), Math.min(ms, 12000));
      window.soqi?.react('notification', 5000);
      if (feat('agentsSound')) playTones([[0, 740], [0.14, 988]], { peak: 0.14, decay: 0.45 });
      remember({ at: Date.now(), kind: 'agent', icon: '🛡️', title, text: s.pending?.summary || s.pending?.message || t('act.needsApproval'), key: s.key });
      if (feat('agentsExpand') && !state.pinned && !state.hover) {
        // open the island on this tab for the alert's duration, then let it go
        state.pinned = true;
        selectTab('activity');
        state.toastUntil = 0;
        render();
        clearTimeout(expandTimer);
        expandTimer = setTimeout(() => { if (state.pinned && !state.hover) { state.pinned = false; render(); } }, ms);
      }
      return;
    }
    // completions stay quiet during a focus session and when Windows is in do-not-disturb
    if (kind === 'done') {
      remember({ at: Date.now(), kind: 'agent', icon: '✅', title, text: t('act.finished'), key: s.key });
      if (focusing() || notif.quiet) return;
      showToast('agent-done', title, t('act.finished'), 0, 4000);
      if (s.canOpen) state.toastAction = open;
    } else if (kind === 'error') {
      remember({ at: Date.now(), kind: 'agent', icon: '⚠️', title, text: s.activity || t('act.error'), key: s.key });
      if (focusing()) return;
      showToast('agent-error', title, s.activity || t('act.error'), 0, 5000);
      if (s.canOpen) state.toastAction = open;
    }
  }

  function notifFresh(it) {
    if (!feat('notifMirror') || !it) return;
    remember({ at: it.at, kind: 'notif', icon: '🔔', title: it.title || it.app, text: it.body ? `${it.app} · ${it.body}` : it.app, id: it.id, proc: it.proc, app: it.app });
    if (focusing() || notif.quiet) return;
    showToast('notif', it.title || it.app, it.title ? it.app : '', 0, 5000);
    if (it.proc) state.toastAction = () => bridge.notif.open(it.id);
    window.soqi?.react('notification', 4000);
  }

  // Windows dropped a notification (dismissed in Action Center): drop it here too
  function syncNotif(n) {
    const was = notif;
    notif = n || notif;
    if (!n) return;
    const ids = new Set((n.items || []).map((i) => i.id));
    let changed = false;
    for (let i = recent.length - 1; i >= 0; i--) if (recent[i].kind === 'notif' && !ids.has(recent[i].id)) { recent.splice(i, 1); changed = true; }
    if (changed || was.enabled !== n.enabled) renderRecent();
  }

  $('#act-clear').addEventListener('click', (e) => {
    e.stopPropagation();
    recent.length = 0;
    notedCount = happenings.length;
    bridge.notif.clear();
    renderRecent();
  });

  bridge.onAgents((a) => { agents = a || agents; renderAgents(); });
  bridge.onAgentAlert(agentAlert);
  bridge.onNotif(syncNotif);
  bridge.onNotifFresh(notifFresh);
  bridge.agents.snapshot().then((a) => { if (a) { agents = a; renderAgents(); } });
  bridge.notif.snapshot().then((n) => { if (n) { notif = n; for (const it of n.items || []) recent.push({ at: it.at, kind: 'notif', icon: '🔔', title: it.title || it.app, text: it.body ? `${it.app} · ${it.body}` : it.app, id: it.id, proc: it.proc, app: it.app }); renderRecent(); } });
  window.addEventListener('island:i18n', () => { renderAgents(); renderRecent(); });
  window.addEventListener('island:features', () => { renderAgents(); renderRecent(); });
  // relative times tick while the tab is open
  setInterval(() => { if (lastMode === 'expanded' && state.tab === 'activity') { pullNotes(); renderAgents(); renderRecent(); } }, 15000);
  window.addEventListener('island:mode', (e) => { if (e.detail.mode === 'expanded') { pullNotes(); renderAgents(); renderRecent(); } });
  renderAgents();
  renderRecent();
})();
