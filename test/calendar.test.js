const test = require('node:test');
const assert = require('node:assert/strict');
const ical = require('node-ical');
const calendar = require('../calendar');

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:test',
  'BEGIN:VEVENT',
  'UID:one',
  'DTSTART:20260105T100000Z',
  'DTEND:20260105T103000Z',
  'SUMMARY:Design review',
  'LOCATION:https://meet.google.com/abc-defg-hij',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:weekly',
  'DTSTART:20260101T090000Z',
  'DTEND:20260101T093000Z',
  'RRULE:FREQ=DAILY;COUNT=10',
  'EXDATE:20260105T090000Z',
  'SUMMARY:Standup',
  'DESCRIPTION:Join https://us02web.zoom.us/j/123456789?pwd=x',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:allday',
  'DTSTART;VALUE=DATE:20260105',
  'DTEND;VALUE=DATE:20260106',
  'SUMMARY:Holiday',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:cancelled',
  'DTSTART:20260105T120000Z',
  'DTEND:20260105T123000Z',
  'SUMMARY:Gone',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');

test('occurrences: expands recurrences, honours EXDATE, skips all-day and cancelled, finds join links', () => {
  const data = ical.sync.parseICS(ICS);
  const from = new Date('2026-01-05T00:00:00Z');
  const to = new Date('2026-01-06T00:00:00Z');
  const out = calendar.occurrences(data, from, to);
  assert.deepEqual(out.map((e) => e.title), ['Design review']);
  assert.equal(out[0].link, 'https://meet.google.com/abc-defg-hij');
  const next = calendar.occurrences(data, new Date('2026-01-06T00:00:00Z'), new Date('2026-01-07T00:00:00Z'));
  assert.deepEqual(next.map((e) => e.title), ['Standup']);
  assert.equal(next[0].link, 'https://us02web.zoom.us/j/123456789?pwd=x');
});

test('isJoinLink accepts only whole meeting links', () => {
  assert.equal(calendar.isJoinLink('https://meet.google.com/abc-defg-hij'), true);
  assert.equal(calendar.isJoinLink('https://teams.microsoft.com/l/meetup-join/x'), true);
  assert.equal(calendar.isJoinLink('https://evil.com/?u=https://meet.google.com/abc'), false);
  assert.equal(calendar.isJoinLink('http://meet.google.com/abc'), false);
  assert.equal(calendar.isJoinLink(42), false);
});

test('setUrl rejects non-https links and normalises webcal', () => {
  assert.deepEqual(calendar.setUrl('javascript:alert(1)'), { ok: false });
  assert.deepEqual(calendar.setUrl('ftp://x/y.ics'), { ok: false });
  assert.deepEqual(calendar.setUrl(''), { ok: true });
  assert.equal(calendar.hasUrl(), false);
});
