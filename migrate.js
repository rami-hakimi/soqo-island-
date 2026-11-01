// One-time moves of persisted names from Nova Island (the upstream project) to Soqo Island.
// Nothing is deleted or rewritten in place: the old data stays exactly where it was, so a
// Nova Island installation that is still in use keeps working.
const fs = require('fs');
const path = require('path');

const MARKER = 'migrated-from-nova-island.json';
// settings keys renamed together with the companion
const FEATURE_KEYS = { novaEyes: 'soqiEyes', novaPrayer: 'soqiPrayer', novaFocus: 'soqiFocus' };
// what is worth carrying over: the app's own JSON stores and the renderer's localStorage
const JSON_FILE = /\.json$/i;
const DIRS = ['Local Storage'];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) {
      try { fs.copyFileSync(s, d); } catch {}
    }
  }
}

// Copies the settings in `oldDir` into `newDir` once: only when newDir has no settings of its
// own yet and the copy was never attempted. Returns the source folder when files were copied,
// '' otherwise.
function userData(oldDir, newDir) {
  try {
    if (!fs.existsSync(oldDir) || !fs.statSync(oldDir).isDirectory()) return '';
    fs.mkdirSync(newDir, { recursive: true });
    const marker = path.join(newDir, MARKER);
    if (fs.existsSync(marker)) return '';
    const own = ['settings.json', 'features.json', 'apps.json'].some((f) => fs.existsSync(path.join(newDir, f)));
    let copied = 0;
    if (!own) {
      for (const e of fs.readdirSync(oldDir, { withFileTypes: true })) {
        const s = path.join(oldDir, e.name);
        const d = path.join(newDir, e.name);
        if (e.isFile() && JSON_FILE.test(e.name)) {
          fs.copyFileSync(s, d);
          copied++;
        } else if (e.isDirectory() && DIRS.includes(e.name)) {
          copyDir(s, d);
          copied++;
        }
      }
    }
    fs.writeFileSync(marker, JSON.stringify({ from: oldDir, at: new Date().toISOString(), copied, skipped: own }, null, 2));
    return copied ? oldDir : '';
  } catch (err) {
    console.error('[migrate]', err.message);
    return '';
  }
}

// features.json from before the rename: old companion keys become the new ones (a value already
// stored under the new key wins).
function featureKeys(obj) {
  const out = { ...(obj || {}) };
  for (const [oldKey, newKey] of Object.entries(FEATURE_KEYS)) {
    if (!(oldKey in out)) continue;
    if (!(newKey in out)) out[newKey] = out[oldKey];
    delete out[oldKey];
  }
  return out;
}

module.exports = { userData, featureKeys, FEATURE_KEYS, MARKER };
