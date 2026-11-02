// Coding-agent events: what a Claude Code or Codex hook reported, reduced to the little the
// island shows. Pure and shared (main + tests): validation of a hook payload, the safe one-line
// summary of a tool request, the per-session state and the de-duplication of repeated events.
//
//   normalize(agent, payload)  -> event | null       (an unknown or malformed payload is dropped)
//   createStore(opts)          -> { apply, list, prune, get, clear, size }
//
// Nothing here executes anything: a payload is data about a session, never a command. Strings
// are bounded, control characters are removed, and only the fields the island needs are kept
// (never prompts, replies or transcripts).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).AgentEvents = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const AGENTS = {
    claude: { name: 'Claude Code', short: 'Claude' },
    codex: { name: 'Codex CLI', short: 'Codex' },
  };
  const LIMITS = { sessionId: 128, cwd: 1024, project: 60, summary: 160, message: 240, tool: 64, message_bytes: 256 * 1024 };
  // session states, in the order the Activity panel lists them (most important first)
  const STATUS_RANK = { attention: 0, error: 1, working: 2, done: 3, idle: 4, ended: 9 };

  // control characters (C0 and C1) and the Unicode line / paragraph separators
  const CTRL = new RegExp('[\\p{Cc}\\u2028\\u2029]+', 'gu');
  const clean = (v, max) => (typeof v === 'string' ? v.replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const ID = /^[\w.:-]{1,128}$/;

  // the last path segment of the working directory: the project label
  function projectOf(cwd) {
    const parts = clean(cwd, LIMITS.cwd).replace(/[\\/]+$/, '').split(/[\\/]/);
    const last = parts[parts.length - 1] || '';
    return clean(last, LIMITS.project);
  }

  // One line a human can judge a permission request by: the command, the file, the URL — never
  // the whole input. With details hidden only the tool's name is shown.
  function safeSummary(tool, input, { hideDetails = false } = {}) {
    const name = clean(tool, LIMITS.tool);
    if (hideDetails || !input || typeof input !== 'object') return name;
    const pick = (k) => clean(input[k], LIMITS.summary);
    let detail = '';
    if (/^(bash|powershell|shell|exec|command|terminal)$/i.test(name) || name.toLowerCase().includes('bash')) detail = pick('command');
    else if (/^(edit|write|read|multiedit|notebookedit|create|delete)$/i.test(name)) detail = pick('file_path') || pick('path') || pick('notebook_path');
    else if (/^(webfetch|fetch)$/i.test(name)) {
      try { detail = new URL(pick('url')).host; } catch { detail = ''; }
    } else if (/^(websearch|grep|glob|search)$/i.test(name)) detail = pick('query') || pick('pattern');
    else if (/^(skill)$/i.test(name)) detail = pick('skill');
    else if (/^(apply_patch|update_plan)$/i.test(name)) detail = '';
    else if (/^mcp__/i.test(name)) detail = '';
    else detail = pick('description') || pick('command') || pick('file_path') || '';
    return detail ? `${name}: ${detail}`.slice(0, LIMITS.summary) : name;
  }

  // hook event name -> what it means for the session (shared by both agents; Codex uses the
  // same vocabulary for its hooks)
  const KINDS = {
    SessionStart: { kind: 'start', status: 'idle' },
    UserPromptSubmit: { kind: 'prompt', status: 'working' },
    PreToolUse: { kind: 'tool', status: 'working' },
    PostToolUse: { kind: 'tool', status: 'working' },
    PostToolUseFailure: { kind: 'toolError', status: 'working' },
    PermissionRequest: { kind: 'approval', status: 'attention' },
    PermissionDenied: { kind: 'tool', status: 'working' },
    Stop: { kind: 'done', status: 'done' },
    StopFailure: { kind: 'error', status: 'error' },
    SubagentStop: { kind: 'tool', status: 'working' },
    SubagentStart: { kind: 'tool', status: 'working' },
    Interrupt: { kind: 'idle', status: 'idle' },
    SessionEnd: { kind: 'end', status: 'ended' },
    PreCompact: { kind: 'tool', status: 'working' },
    PostCompact: { kind: 'tool', status: 'working' },
  };
  // Notification hook: only a few notification types matter
  const NOTIFICATIONS = {
    permission_prompt: { kind: 'approval', status: 'attention' },
    elicitation_dialog: { kind: 'question', status: 'attention' },
    elicitation_url_dialog: { kind: 'question', status: 'attention' },
    agent_needs_input: { kind: 'question', status: 'attention' },
    idle_prompt: { kind: 'idle', status: 'idle' },
    agent_completed: { kind: 'done', status: 'done' },
  };

  function normalize(agent, raw, opts = {}) {
    if (!AGENTS[agent] || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const name = clean(raw.hook_event_name, 40);
    const rawId = raw.session_id || raw.thread_id || raw.conversation_id;
    if (typeof rawId !== 'string' || rawId.length > LIMITS.sessionId) return null;
    const sessionId = clean(rawId, LIMITS.sessionId);
    if (!name || !ID.test(sessionId)) return null;
    let meta = KINDS[name];
    let notificationType = '';
    if (name === 'Notification') {
      notificationType = clean(raw.notification_type || raw.matcher, 40);
      meta = NOTIFICATIONS[notificationType] || { kind: 'info', status: null };
    }
    if (!meta) return null;
    const at = Number.isFinite(opts.now) ? opts.now : Date.now();
    const tool = clean(raw.tool_name, LIMITS.tool);
    const ev = {
      agent, sessionId, key: `${agent}:${sessionId}`, kind: meta.kind, status: meta.status, name, at,
      cwd: clean(raw.cwd, LIMITS.cwd), project: projectOf(raw.cwd), tool,
      toolUseId: clean(raw.tool_use_id, 96), notificationType,
      summary: '', message: '',
    };
    if (meta.kind === 'approval' || meta.kind === 'tool' || meta.kind === 'toolError') ev.summary = safeSummary(tool, raw.tool_input, { hideDetails: !!opts.hideDetails });
    if (name === 'Notification') ev.message = clean(raw.message, LIMITS.message);
    if (name === 'StopFailure') ev.message = clean(raw.error, LIMITS.message);
    if (name === 'PostToolUseFailure') ev.message = clean(raw.error, LIMITS.message);
    if (name === 'SessionEnd') ev.message = clean(raw.reason, 40);
    return ev;
  }

  // Sessions seen so far. apply() returns what changed and which alert (if any) is worth a toast.
  function createStore({ now = Date.now, staleMs = 2 * 60 * 60 * 1000, doneMs = 30 * 60 * 1000, maxSessions = 32, dedupMs = 1500 } = {}) {
    /** @type {Map<string, any>} */
    const sessions = new Map();

    function apply(ev) {
      if (!ev) return { changed: false, alert: null, session: null };
      const t = Number.isFinite(ev.at) ? ev.at : now();
      let s = sessions.get(ev.key);
      if (!s) {
        if (ev.kind === 'end') return { changed: false, alert: null, session: null };
        s = { key: ev.key, agent: ev.agent, sessionId: ev.sessionId, project: ev.project, cwd: ev.cwd, status: 'idle', since: t, at: t, startedAt: t, activity: '', pending: null, last: null, target: null, prompts: 0 };
        sessions.set(ev.key, s);
        if (sessions.size > maxSessions) {
          // drop the oldest ended / idle session first
          const victim = [...sessions.values()].filter((v) => v !== s).sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || a.at - b.at)[0];
          if (victim) sessions.delete(victim.key);
        }
      }
      if (ev.project) s.project = ev.project;
      if (ev.cwd) s.cwd = ev.cwd;
      // the same thing reported twice in a moment (two hooks for one prompt, a retry): once is enough
      const last = s.last;
      const same = last && last.kind === ev.kind && last.status === ev.status && last.summary === ev.summary && last.toolUseId === ev.toolUseId && t - last.at < dedupMs;
      if (same) { s.at = t; return { changed: false, alert: null, session: s }; }
      s.last = { kind: ev.kind, status: ev.status, summary: ev.summary, toolUseId: ev.toolUseId, at: t };
      s.at = t;
      let alert = null;
      const prev = s.status;
      if (ev.kind === 'prompt') s.prompts++;
      if (ev.kind === 'approval' || ev.kind === 'question') {
        const id = ev.toolUseId || ev.summary || ev.message || ev.kind;
        // the Notification that follows a PermissionRequest for the same request is not a second alert
        if (s.pending && s.pending.id === id) { s.pending.at = t; return { changed: false, alert: null, session: s }; }
        if (s.pending && ev.kind === 'approval' && !ev.toolUseId && !ev.summary && t - s.pending.at < 30000) return { changed: false, alert: null, session: s };
        s.pending = { id, kind: ev.kind, summary: ev.summary, message: ev.message, at: t };
        s.activity = ev.summary || ev.message;
        alert = ev.kind;
      } else if (ev.status) {
        // anything else the session does clears a pending request (it was answered in the agent)
        s.pending = null;
        if (ev.kind === 'tool' || ev.kind === 'toolError') s.activity = ev.summary;
        else if (ev.kind === 'error') s.activity = ev.message;
        else if (ev.kind === 'prompt' || ev.kind === 'start') s.activity = '';
        if (ev.kind === 'done') alert = 'done';
        if (ev.kind === 'error') alert = 'error';
        if (ev.kind === 'toolError') alert = null;
      }
      if (ev.status && ev.status !== prev) {
        s.status = ev.status;
        s.since = t;
      }
      // a session that said goodbye leaves the list
      if (ev.kind === 'end') sessions.delete(ev.key);
      return { changed: true, alert, session: s };
    }

    // the sessions worth listing, most important first, newest first within a state
    function list() {
      prune();
      return [...sessions.values()].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.at - a.at).map((s) => ({ ...s, last: undefined }));
    }

    // forgotten: finished sessions after doneMs, anything silent for staleMs
    function prune(at = now()) {
      for (const [k, s] of sessions) {
        const limit = s.status === 'done' || s.status === 'idle' ? Math.min(doneMs, staleMs) : staleMs;
        if (at - s.at > limit) sessions.delete(k);
        else if (s.pending && at - s.pending.at > staleMs) s.pending = null;
      }
    }

    return { apply, list, prune, get: (key) => sessions.get(key) || null, clear: () => sessions.clear(), get size() { return sessions.size; } };
  }

  return { AGENTS, LIMITS, STATUS_RANK, normalize, safeSummary, projectOf, clean, createStore };
});
