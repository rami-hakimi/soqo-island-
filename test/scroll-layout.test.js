// Scrolling inside the island (regression for the hidden Battery row and the clipboard list that
// could not be scrolled in 2.0.0-beta.5). The island is a fixed 548 × 232 capsule; the bug was a
// panel grid whose single row grew to its tallest card instead of being bounded by the view, so
// nothing scrolled and the overflow was clipped. These checks pin the rules that keep every
// panel's content reachable: bounded grid rows, scrolling regions, the wheel reaching them, no
// island drag from them, keyboard focus on them, and a clipboard history worth scrolling.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'src/renderer/island/style.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'src/renderer/island/index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'src/renderer/island/renderer.js'), 'utf8');
const system = fs.readFileSync(path.join(ROOT, 'src/main/system.js'), 'utf8');

const rule = (selector) => {
  const m = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `rule for ${selector}`);
  return m[1];
};

test('panel grids are bounded by the view: one row of minmax(0, 1fr), min-height 0', () => {
  for (const sel of ['.sys', '.act', '.pr']) {
    const body = rule(sel);
    assert.match(body, /grid-template-rows:\s*minmax\(0,\s*1fr\)/, `${sel} row is bounded`);
    assert.match(body, /min-height:\s*0/, `${sel} may shrink to the view`);
  }
  assert.match(rule('.view'), /min-height:\s*0/);
  assert.match(rule('.sys > .card'), /min-height:\s*0/, 'the cards shrink with the row instead of growing it');
  assert.match(rule('.clips'), /min-height:\s*0/);
  assert.match(rule('.pr-side'), /min-height:\s*0/);
});

test('scrolling regions: overflow inside the card, thin scrollbar, no scroll chaining, keyboard focus', () => {
  const body = rule('.scroll');
  assert.match(body, /overflow-y:\s*auto/);
  assert.match(body, /min-height:\s*0/);
  assert.match(body, /overscroll-behavior:\s*contain/);
  assert.match(css, /\.scroll::-webkit-scrollbar\s*\{[^}]*width:\s*6px/);
  assert.match(css, /\.scroll:focus-visible/);
  // the meters card centres its rows only while they fit; otherwise it starts at the top (safe)
  assert.match(rule('.meters'), /justify-content:\s*safe center/);
  assert.match(rule('.meters > .meter'), /flex:\s*none/, 'rows keep their height instead of being squeezed');
  assert.match(rule('.clip-list'), /min-height:\s*0/);
  assert.doesNotMatch(rule('.clip-list'), /padding-right/, 'logical padding for RTL');
});

test('every list that can overflow is a scrolling region with keyboard focus and a name', () => {
  const regions = ['apps-grid', 'apps-list', 'dl-list', 'pr-list', 'clip-list', 'act-agents', 'act-recent'];
  for (const id of regions) {
    const tag = html.match(new RegExp(`<div[^>]*id="${id}"[^>]*>`));
    assert.ok(tag, id);
    assert.match(tag[0], /class="[^"]*\bscroll\b/, `${id} scrolls`);
    assert.match(tag[0], /tabindex="0"/, `${id} is focusable`);
    assert.match(tag[0], /aria-label="[^"]+"/, `${id} has a name`);
  }
  const meters = html.match(/<div class="card meters[^>]*>/);
  assert.ok(meters);
  assert.match(meters[0], /\bscroll\b/);
  assert.match(meters[0], /tabindex="0"/);
  assert.match(meters[0], /data-i18n-aria="sys.metersAria"/);
  // the Battery row lives inside the meters card, after Brightness
  const card = html.slice(html.indexOf('<div class="card meters'), html.indexOf('<div class="card clips'));
  assert.ok(card.indexOf('id="bright-row"') < card.indexOf('id="batt-row"'));
});

test('the wheel scrolls regions instead of changing the volume; a drag on a region never moves the island', () => {
  const wheel = renderer.slice(renderer.indexOf("island.addEventListener('wheel'"), renderer.indexOf('{ passive: false }'));
  assert.match(wheel, /closest\('\.scroll, \.shelf-items, \.wx-pop'\)[^\n]*return;/, 'wheel over a region returns before preventDefault');
  assert.ok(wheel.indexOf('return;') < wheel.indexOf('preventDefault'));
  const noDrag = renderer.match(/const NO_DRAG = '([^']+)'/)[1];
  assert.ok(noDrag.split(',').map((s) => s.trim()).includes('.scroll'), 'NO_DRAG covers scrolling regions (and their scrollbars)');
  // keyboard: a click on the region's own surface asks main for focus; Escape and collapsing give it back
  assert.match(renderer, /e\.target !== region\) return;\s*\n\s*bridge\.focusInput\(true\)/);
  assert.match(renderer, /e\.key !== 'Escape'[\s\S]*bridge\.focusInput\(false\)/);
  assert.match(renderer, /island:mode[\s\S]*closest\('\.scroll'\)[\s\S]*bridge\.focusInput\(false\)/);
});

test('the clipboard history keeps 20 entries', () => {
  assert.match(system, /const MAX_CLIPS = 20;/);
});
