const test = require('node:test');
const assert = require('node:assert/strict');
const AC = require('../src/shared/agent-config');

const HELPER = 'C:\\Users\\me\\AppData\\Local\\Programs\\Soqo Island\\resources\\app.asar.unpacked\\helper\\soqo-helper.exe';

// a user's Claude Code settings with hooks of their own
const USER = () => ({
  permissions: { allow: ['Bash(npm test)'] },
  model: 'opus',
  hooks: {
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node C:/me/lint.js', timeout: 10 }] }],
    Stop: [{ hooks: [{ type: 'command', command: 'powershell -File C:/me/done.ps1' }] }],
  },
});

test('commandFor: bash gets forward slashes, cmd.exe gets backslashes, both quoted', () => {
  assert.equal(AC.commandFor('claude', HELPER), '"C:/Users/me/AppData/Local/Programs/Soqo Island/resources/app.asar.unpacked/helper/soqo-helper.exe" hook claude');
  assert.equal(AC.commandFor('codex', 'C:/a b/soqo-helper.exe'), '"C:\\a b\\soqo-helper.exe" hook codex');
  assert.equal(AC.commandFor('claude', 'C:\\x\\soqo-helper.exe', 'C:\\data\\agents-bridge.json'), '"C:/x/soqo-helper.exe" hook claude "C:/data/agents-bridge.json"');
  assert.ok(AC.isSoqoHandler({ type: 'command', command: AC.commandFor('codex', HELPER) }));
  assert.equal(AC.isSoqoHandler({ type: 'command', command: 'node C:/me/lint.js' }), false);
  assert.equal(AC.isSoqoHandler({ type: 'command', command: 'echo soqo-helper.exe is not a hook' }), false);
});

test('connect keeps every user setting and hook, adds only Soqo entries', () => {
  const before = USER();
  const frozen = JSON.stringify(before);
  const after = AC.connect('claude', before, HELPER);
  assert.equal(JSON.stringify(before), frozen, 'the input object is not mutated');
  assert.deepEqual(after.permissions, before.permissions);
  assert.equal(after.model, 'opus');
  // the user's own hooks are still there, byte for byte
  assert.deepEqual(after.hooks.PreToolUse[0], before.hooks.PreToolUse[0]);
  assert.deepEqual(after.hooks.Stop[0], before.hooks.Stop[0]);
  // and ours were appended for every event we need
  for (const event of Object.keys(AC.CLAUDE_EVENTS)) {
    const groups = after.hooks[event];
    assert.ok(Array.isArray(groups), event);
    const own = groups.flatMap((g) => g.hooks).filter(AC.isSoqoHandler);
    assert.equal(own.length, 1, `${event} has one Soqo handler`);
    assert.equal(own[0].type, 'command');
    assert.ok(own[0].timeout <= 5);
  }
  assert.equal(after.hooks.Notification[0].matcher, AC.CLAUDE_EVENTS.Notification.matcher);
  assert.equal(after.hooks.SessionEnd[0].hooks[0].async, undefined, 'session end is synchronous (the agent is about to exit)');
  assert.equal(after.hooks.Stop[1].hooks[0].async, true);
  assert.equal(AC.status('claude', after, HELPER).current, true);
  assert.equal(AC.status('claude', after, HELPER).count, Object.keys(AC.CLAUDE_EVENTS).length);
});

test('connect twice is idempotent; a moved installation replaces the old path', () => {
  const once = AC.connect('claude', USER(), HELPER);
  const twice = AC.connect('claude', once, HELPER);
  assert.deepEqual(twice, once);
  const moved = AC.connect('claude', once, 'D:\\Apps\\Soqo\\helper\\soqo-helper.exe');
  const st = AC.status('claude', moved, 'D:/Apps/Soqo/helper/soqo-helper.exe');
  assert.equal(st.count, Object.keys(AC.CLAUDE_EVENTS).length, 'no duplicates');
  assert.equal(st.current, true);
  assert.equal(AC.status('claude', once, 'D:/Apps/Soqo/helper/soqo-helper.exe').current, false, 'old path reads as outdated');
});

test('disconnect removes exactly Soqo entries and restores the original shape', () => {
  const original = USER();
  const connected = AC.connect('claude', original, HELPER);
  const { settings, removed } = AC.disconnect(connected);
  assert.equal(removed, Object.keys(AC.CLAUDE_EVENTS).length);
  assert.deepEqual(settings, original, 'back to the user\'s file');
  // nothing to remove: nothing changes
  assert.equal(AC.disconnect(original).removed, 0);
  assert.deepEqual(AC.disconnect(original).settings, original);
  // a file with only Soqo hooks loses the hooks key entirely
  const bare = AC.connect('codex', {}, HELPER);
  const back = AC.disconnect(bare);
  assert.equal(back.removed, Object.keys(AC.CODEX_EVENTS).length);
  assert.deepEqual(back.settings, {});
  // a group that mixes a user hook and ours keeps the user's
  const mixed = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo mine' }, { type: 'command', command: AC.commandFor('claude', HELPER) }] }] } };
  assert.deepEqual(AC.disconnect(mixed).settings, { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo mine' }] }] } });
});

test('odd files survive: non-object settings, non-array events, handlers without commands', () => {
  assert.deepEqual(AC.disconnect(null), { settings: {}, removed: 0 });
  assert.deepEqual(AC.disconnect('text').settings, 'text');
  const weird = { hooks: { Stop: 'not an array', PreToolUse: [{ hooks: 'nope' }, null, { hooks: [{ type: 'prompt', prompt: 'x' }] }] } };
  const c = AC.connect('claude', weird, HELPER);
  assert.equal(c.hooks.Stop, 'not an array', 'kept as is, and no Soqo entry forced into it');
  const d = AC.disconnect(c);
  assert.deepEqual(d.settings, weird);
  assert.equal(AC.status('claude', { hooks: null }, HELPER).connected, false);
  assert.equal(AC.status('claude', 5, HELPER).connected, false);
});

test('codex: hooks.json shape, synchronous SessionEnd within its 3 s budget', () => {
  const file = AC.connect('codex', { description: 'my hooks' }, HELPER);
  assert.equal(file.description, 'my hooks');
  for (const event of Object.keys(AC.CODEX_EVENTS)) assert.ok(file.hooks[event], event);
  assert.ok(file.hooks.SessionEnd[0].hooks[0].timeout <= 3);
  assert.ok(file.hooks.Interrupt[0].hooks[0].timeout <= 1);
  assert.equal(file.hooks.Notification, undefined, 'Codex has no Notification event');
  assert.match(file.hooks.PermissionRequest[0].hooks[0].command, /^"C:\\Users\\me\\.*soqo-helper\.exe" hook codex$/);
});

test('formatting follows the existing file: indent, line endings, trailing newline', () => {
  assert.deepEqual(AC.styleOf('{\n    "a": 1\n}\n'), { indent: '    ', eol: '\n', trailingNewline: true });
  assert.deepEqual(AC.styleOf('{\r\n\t"a": 1\r\n}'), { indent: '\t', eol: '\r\n', trailingNewline: false });
  assert.deepEqual(AC.styleOf(''), { indent: '  ', eol: '\n', trailingNewline: true });
  assert.equal(AC.format({ a: 1 }, AC.styleOf('{\r\n\t"x": 1\r\n}')), '{\r\n\t"a": 1\r\n}');
  assert.equal(AC.format({ a: 1 }), '{\n  "a": 1\n}\n');
});
