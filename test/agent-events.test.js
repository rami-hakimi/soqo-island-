const test = require('node:test');
const assert = require('node:assert/strict');
const AE = require('../src/shared/agent-events');

const claude = (over = {}) => ({ session_id: 'f3a1c2d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d', cwd: 'C:\\Users\\me\\projects\\soqo-island', hook_event_name: 'UserPromptSubmit', ...over });

test('normalize: the few fields the island needs, nothing else', () => {
  const ev = AE.normalize('claude', claude({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'npm test', content: 'secret' }, prompt: 'never' }));
  assert.equal(ev.agent, 'claude');
  assert.equal(ev.project, 'soqo-island');
  assert.equal(ev.kind, 'approval');
  assert.equal(ev.status, 'attention');
  assert.equal(ev.summary, 'Bash: npm test');
  assert.equal('prompt' in ev, false);
  assert.equal(JSON.stringify(ev).includes('secret'), false, 'tool_input content never leaves the summary');
});

test('normalize: every lifecycle event maps to a state; unknown events are dropped', () => {
  const want = { SessionStart: 'idle', UserPromptSubmit: 'working', PreToolUse: 'working', PostToolUse: 'working', PermissionRequest: 'attention', Stop: 'done', StopFailure: 'error', SessionEnd: 'ended', Interrupt: 'idle' };
  for (const [name, status] of Object.entries(want)) assert.equal(AE.normalize('codex', claude({ hook_event_name: name })).status, status, name);
  assert.equal(AE.normalize('claude', claude({ hook_event_name: 'MadeUp' })), null);
  assert.equal(AE.normalize('gemini', claude()), null, 'unknown agent');
});

test('normalize: Notification types that matter', () => {
  const n = (type) => AE.normalize('claude', claude({ hook_event_name: 'Notification', notification_type: type, message: 'Claude needs your permission to use Bash' }));
  assert.equal(n('permission_prompt').kind, 'approval');
  assert.equal(n('idle_prompt').status, 'idle');
  assert.equal(n('elicitation_dialog').kind, 'question');
  assert.equal(n('auth_success').status, null, 'informational only: no state change');
  assert.equal(n('permission_prompt').message, 'Claude needs your permission to use Bash');
});

test('normalize: malformed, hostile and oversized payloads are rejected or bounded', () => {
  assert.equal(AE.normalize('claude', null), null);
  assert.equal(AE.normalize('claude', 'string'), null);
  assert.equal(AE.normalize('claude', []), null);
  assert.equal(AE.normalize('claude', { hook_event_name: 'Stop' }), null, 'no session id');
  assert.equal(AE.normalize('claude', claude({ session_id: '../../etc/passwd' })), null, 'session ids are identifiers');
  assert.equal(AE.normalize('claude', claude({ session_id: 'x'.repeat(200) })), null);
  assert.equal(AE.normalize('claude', claude({ session_id: '<script>alert(1)</script>' })), null);
  const big = AE.normalize('claude', claude({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'A'.repeat(10000) + '\u0000\u001b[31m' }, cwd: 'C:\\' + 'd\\'.repeat(2000) }));
  assert.ok(big.summary.length <= AE.LIMITS.summary);
  assert.ok(big.cwd.length <= AE.LIMITS.cwd);
  assert.equal(/\p{Cc}/u.test(big.summary), false, 'control characters stripped');
  // prototype pollution attempts are plain data
  const polluted = AE.normalize('claude', claude({ __proto__: { evil: 1 }, constructor: { prototype: { evil: 1 } } }));
  assert.ok(polluted);
  assert.equal(({}).evil, undefined);
  // numbers and objects where strings are expected
  const odd = AE.normalize('claude', claude({ cwd: 42, tool_name: { a: 1 }, hook_event_name: 'PreToolUse', tool_input: 'not an object' }));
  assert.equal(odd.project, '');
  assert.equal(odd.summary, '');
});

test('safeSummary: shows the one field a human judges by, with details hidden only the tool', () => {
  assert.equal(AE.safeSummary('Edit', { file_path: 'C:\\p\\a.js', old_string: 'x', new_string: 'y' }), 'Edit: C:\\p\\a.js');
  assert.equal(AE.safeSummary('WebFetch', { url: 'https://example.com/secret?token=1' }), 'WebFetch: example.com');
  assert.equal(AE.safeSummary('Bash', { command: 'rm -rf /' }, { hideDetails: true }), 'Bash');
  assert.equal(AE.safeSummary('mcp__github__create_issue', { title: 'x' }), 'mcp__github__create_issue');
  assert.equal(AE.safeSummary('apply_patch', { command: '*** Begin Patch' }), 'apply_patch');
});

// ---- the session store ----
function mk(now = 0) {
  let clock = now;
  const store = AE.createStore({ now: () => clock, dedupMs: 1500 });
  const at = (ms) => { clock = ms; return ms; };
  const ev = (agent, sid, name, extra = {}) => AE.normalize(agent, { session_id: sid, cwd: `C:/w/${sid}`, hook_event_name: name, ...extra }, { now: clock });
  return { store, at, ev };
}

test('store: start → working → approval → done, with the alerts a user wants', () => {
  const { store, at, ev } = mk(1000);
  assert.equal(store.apply(ev('claude', 'aaaa', 'SessionStart')).alert, null);
  at(2000);
  assert.equal(store.apply(ev('claude', 'aaaa', 'UserPromptSubmit')).alert, null);
  assert.equal(store.get('claude:aaaa').status, 'working');
  at(3000);
  const r = store.apply(ev('claude', 'aaaa', 'PermissionRequest', { tool_name: 'Bash', tool_use_id: 'tu1', tool_input: { command: 'git push' } }));
  assert.equal(r.alert, 'approval');
  assert.equal(store.get('claude:aaaa').status, 'attention');
  assert.equal(store.get('claude:aaaa').pending.summary, 'Bash: git push');
  // the Notification that follows the same request is not a second alert
  at(9000);
  const again = store.apply(ev('claude', 'aaaa', 'Notification', { notification_type: 'permission_prompt', message: 'Claude needs your permission to use Bash' }));
  assert.equal(again.alert, null);
  // answered in the terminal: the tool ran
  at(12000);
  assert.equal(store.apply(ev('claude', 'aaaa', 'PostToolUse', { tool_name: 'Bash', tool_use_id: 'tu1', tool_input: { command: 'git push' } })).alert, null);
  assert.equal(store.get('claude:aaaa').pending, null);
  assert.equal(store.get('claude:aaaa').status, 'working');
  at(20000);
  assert.equal(store.apply(ev('claude', 'aaaa', 'Stop')).alert, 'done');
  assert.equal(store.get('claude:aaaa').status, 'done');
  at(21000);
  store.apply(ev('claude', 'aaaa', 'SessionEnd'));
  assert.equal(store.get('claude:aaaa'), null, 'ended sessions leave the list');
});

test('store: several sessions at once, sorted most important first; errors and failures', () => {
  const { store, at, ev } = mk(1000);
  store.apply(ev('claude', 'one', 'UserPromptSubmit'));
  at(2000); store.apply(ev('codex', 'two', 'UserPromptSubmit'));
  at(3000); store.apply(ev('claude', 'three', 'SessionStart'));
  at(4000); store.apply(ev('codex', 'two', 'PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'cargo build' } }));
  at(5000);
  const err = store.apply(ev('claude', 'one', 'StopFailure', { error: 'rate_limit' }));
  assert.equal(err.alert, 'error');
  const list = store.list();
  assert.deepEqual(list.map((s) => s.key), ['codex:two', 'claude:one', 'claude:three']);
  assert.equal(list[0].status, 'attention');
  assert.equal(list[1].activity, 'rate_limit');
  assert.equal(store.size, 3);
  // a tool failure is noted on the session, but is not a session failure and not an alert
  at(6000);
  const tf = store.apply(ev('claude', 'three', 'PostToolUseFailure', { tool_name: 'Bash', tool_input: { command: 'npm test' }, error: 'exit 1' }));
  assert.equal(tf.alert, null);
  assert.equal(store.get('claude:three').status, 'working');
});

test('store: duplicates within a moment are ignored, repeats later are not', () => {
  const { store, at, ev } = mk(1000);
  const p = () => ev('claude', 'dup', 'PreToolUse', { tool_name: 'Read', tool_input: { file_path: 'a.txt' } });
  assert.equal(store.apply(p()).changed, true);
  at(1400);
  assert.equal(store.apply(p()).changed, false, 'same event 400 ms later');
  at(4000);
  assert.equal(store.apply(p()).changed, true, 'same event 3 s later is a new tool call');
  // two identical approval requests for the same tool use are one request
  at(5000);
  assert.equal(store.apply(ev('claude', 'dup', 'PermissionRequest', { tool_name: 'Bash', tool_use_id: 'z', tool_input: { command: 'x' } })).alert, 'approval');
  at(9000);
  assert.equal(store.apply(ev('claude', 'dup', 'PermissionRequest', { tool_name: 'Bash', tool_use_id: 'z', tool_input: { command: 'x' } })).alert, null);
  // an end for a session never seen does nothing
  assert.equal(store.apply(ev('codex', 'ghost', 'SessionEnd')).changed, false);
  assert.equal(store.get('codex:ghost'), null);
});

test('store: stale sessions are pruned, finished ones sooner; the list is bounded', () => {
  const { store, at, ev } = mk(0);
  store.apply(ev('claude', 'old', 'UserPromptSubmit'));
  at(10 * 60 * 1000); store.apply(ev('claude', 'fin', 'Stop'));
  at(45 * 60 * 1000);
  assert.deepEqual(store.list().map((s) => s.key), ['claude:old'], 'done sessions are forgotten after 30 min');
  at(2 * 60 * 60 * 1000 + 1);
  assert.equal(store.list().length, 0, 'a session silent for two hours is gone');
  for (let i = 0; i < 40; i++) { at(3 * 60 * 60 * 1000 + i); store.apply(ev('codex', `s${i}`, 'UserPromptSubmit')); }
  assert.ok(store.size <= 32);
});

test('store: a pending request that is never answered expires with the session, not before', () => {
  const { store, at, ev } = mk(0);
  store.apply(ev('claude', 'wait', 'PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'x' } }));
  at(60 * 60 * 1000);
  assert.equal(store.list()[0].pending.summary, 'Bash: x', 'still waiting after an hour');
  at(2 * 60 * 60 * 1000 + 1);
  assert.equal(store.list().length, 0);
});
