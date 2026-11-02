// The hook entries Soqo Island adds to a coding agent's user-level configuration, and how they
// are added and removed again without touching anything else. Pure functions over parsed JSON
// (main does the reading, the backup and the writing); shared with the tests.
//
// Claude Code: ~/.claude/settings.json, "hooks" → event → [{ matcher?, hooks: [handler] }]
// Codex CLI:   ~/.codex/hooks.json,     "hooks" → event → [{ matcher?, hooks: [handler] }]
//
// Every handler Soqo owns runs the helper's hook subcommand ("…/soqo-helper.exe" hook claude).
// That command string is the ownership marker: connect replaces Soqo's own entries (so a moved
// installation gets the new path), disconnect removes exactly those and nothing else, and
// entries the user wrote stay byte-for-byte as they were.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else /** @type {any} */ (root).AgentConfig = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MARK = /soqo-helper\.exe"?\s+hook\s+(claude|codex)\b/i;

  // the hooks each agent gets; all informational, none blocks the agent
  const CLAUDE_EVENTS = {
    SessionStart: { async: true, timeout: 5 },
    UserPromptSubmit: { async: true, timeout: 5 },
    PreToolUse: { async: true, timeout: 5 },
    PostToolUse: { async: true, timeout: 5 },
    PostToolUseFailure: { async: true, timeout: 5 },
    PermissionRequest: { async: true, timeout: 5 },
    Notification: { matcher: 'permission_prompt|idle_prompt|elicitation_dialog|elicitation_url_dialog|agent_needs_input', async: true, timeout: 5 },
    Stop: { async: true, timeout: 5 },
    StopFailure: { async: true, timeout: 5 },
    SessionEnd: { timeout: 3 },
  };
  const CODEX_EVENTS = {
    SessionStart: { async: true, timeout: 5 },
    UserPromptSubmit: { async: true, timeout: 5 },
    PreToolUse: { async: true, timeout: 5 },
    PostToolUse: { async: true, timeout: 5 },
    PermissionRequest: { async: true, timeout: 5 },
    Stop: { async: true, timeout: 5 },
    Interrupt: { timeout: 1 },
    SessionEnd: { timeout: 2 },
  };

  // Claude Code runs command hooks through bash: forward slashes survive every quoting rule.
  // Codex runs them through cmd.exe /C "…": a quoted Windows path with backslashes.
  // bridgeFile: only development runs with their own data folder pass it; an installation's
  // hooks find the bridge in %APPDATA%\soqo-island by themselves.
  const commandFor = (agent, helperPath, bridgeFile) => {
    const slash = (v) => (agent === 'claude' ? String(v || '').replace(/\\/g, '/') : String(v || '').replace(/\//g, '\\'));
    return `"${slash(helperPath)}" hook ${agent}${bridgeFile ? ` "${slash(bridgeFile)}"` : ''}`;
  };

  const isSoqoHandler = (h) => !!h && typeof h === 'object' && typeof h.command === 'string' && MARK.test(h.command);
  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

  function handler(agent, helperPath, spec, bridgeFile) {
    const h = { type: 'command', command: commandFor(agent, helperPath, bridgeFile) };
    if (spec.async) h.async = true;
    h.timeout = spec.timeout;
    return h;
  }

  // Remove Soqo's handlers from a hooks object (mutates a copy; empty groups and events go too).
  // Returns { hooks, removed }.
  function strip(hooks) {
    let removed = 0;
    const out = {};
    for (const [event, groups] of Object.entries(isObj(hooks) ? hooks : {})) {
      if (!Array.isArray(groups)) { out[event] = groups; continue; }
      const kept = [];
      for (const g of groups) {
        if (!isObj(g) || !Array.isArray(g.hooks)) { kept.push(g); continue; }
        const hs = g.hooks.filter((h) => { const own = isSoqoHandler(h); if (own) removed++; return !own; });
        if (hs.length) kept.push(hs.length === g.hooks.length ? g : { ...g, hooks: hs });
        // a group that only held Soqo's handler disappears with it
      }
      if (kept.length) out[event] = kept;
    }
    return { hooks: out, removed };
  }

  // Add Soqo's handlers for an agent (after stripping older ones). Returns the new hooks object.
  function add(agent, hooks, helperPath, bridgeFile) {
    const events = agent === 'claude' ? CLAUDE_EVENTS : CODEX_EVENTS;
    const out = strip(hooks).hooks;
    for (const [event, spec] of Object.entries(events)) {
      // an event whose value is not a list is something we do not understand: left untouched
      if (out[event] !== undefined && !Array.isArray(out[event])) continue;
      const group = { hooks: [handler(agent, helperPath, spec, bridgeFile)] };
      if (spec.matcher) group.matcher = spec.matcher;
      out[event] = [...(out[event] || []), group];
    }
    return out;
  }

  // --- whole-file operations: the settings object in, the settings object out ---
  function connect(agent, settings, helperPath, bridgeFile) {
    const base = isObj(settings) ? { ...settings } : {};
    base.hooks = add(agent, base.hooks, helperPath, bridgeFile);
    return base;
  }

  function disconnect(settings) {
    if (!isObj(settings)) return { settings: settings ?? {}, removed: 0 };
    const { hooks, removed } = strip(settings.hooks);
    const out = { ...settings };
    if (Object.keys(hooks).length) out.hooks = hooks;
    else delete out.hooks;
    return { settings: out, removed };
  }

  // What is installed now: how many Soqo handlers, which helper path they point at, and whether
  // that path matches the one this installation would write.
  function status(agent, settings, helperPath, bridgeFile) {
    let count = 0;
    const paths = new Set();
    for (const groups of Object.values(isObj(settings) && isObj(settings.hooks) ? settings.hooks : {})) {
      for (const g of Array.isArray(groups) ? groups : []) {
        for (const h of isObj(g) && Array.isArray(g.hooks) ? g.hooks : []) {
          if (!isSoqoHandler(h)) continue;
          count++;
          const m = h.command.match(/^"?(.*?soqo-helper\.exe)"?\s+hook\s+\w+(?:\s+"?([^"]*)"?)?/i);
          if (m) paths.add(`${m[1].replace(/\\/g, '/').toLowerCase()}|${(m[2] || '').replace(/\\/g, '/').toLowerCase()}`);
        }
      }
    }
    const want = `${String(helperPath || '').replace(/\\/g, '/').toLowerCase()}|${String(bridgeFile || '').replace(/\\/g, '/').toLowerCase()}`;
    const expected = Object.keys(agent === 'claude' ? CLAUDE_EVENTS : CODEX_EVENTS).length;
    return { connected: count > 0, count, expected, current: count === expected && paths.size === 1 && paths.has(want), paths: [...paths] };
  }

  // The indentation and line ending of an existing JSON file, so a rewrite looks like the original.
  function styleOf(text) {
    const s = String(text || '');
    const eol = s.includes('\r\n') ? '\r\n' : '\n';
    const m = s.match(/\n([ \t]+)"/);
    const indent = m ? m[1] : '  ';
    return { indent, eol, trailingNewline: /\r?\n$/.test(s) || !s.trim() };
  }
  function format(obj, style) {
    const st = style || { indent: '  ', eol: '\n', trailingNewline: true };
    let text = JSON.stringify(obj, null, st.indent);
    if (st.eol !== '\n') text = text.replace(/\n/g, st.eol);
    return st.trailingNewline ? text + st.eol : text;
  }

  return { CLAUDE_EVENTS, CODEX_EVENTS, MARK, commandFor, isSoqoHandler, strip, add, connect, disconnect, status, styleOf, format };
});
