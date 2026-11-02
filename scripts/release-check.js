// Checks what a build ships before it is uploaded anywhere.
//   node scripts/release-check.js                 validate dist/ and write dist/SHA256SUMS.txt
//   node scripts/release-check.js --tag v1.2.3    also require the tag to match package.json
//   node scripts/release-check.js --tag v1.2.3 --pre   tag check only (before the build)
// Verified: installer, blockmap and latest.yml exist; latest.yml names the installer with its
// real size and SHA-512; the packaged app contains LICENSE, NOTICE.md and the Qur'an font
// licence; Electron's Chromium notices sit next to the executable.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const { version, build } = require(path.join(ROOT, 'package.json'));
const args = process.argv.slice(2);
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : null;
const preOnly = args.includes('--pre');

let failed = 0;
const fail = (msg) => { failed++; console.error(`✖ ${msg}`); };
const ok = (msg) => console.log(`✓ ${msg}`);

if (tag) {
  if (tag === `v${version}`) ok(`tag ${tag} matches package.json version ${version}`);
  else fail(`tag ${tag} does not match package.json version ${version}`);
}
if (preOnly) process.exit(failed ? 1 : 0);

const installer = build.nsis.artifactName.replace('${version}', version).replace('${ext}', 'exe');
const required = [installer, `${installer}.blockmap`, 'latest.yml'];
for (const f of required) {
  if (fs.existsSync(path.join(DIST, f))) ok(`${f} present`);
  else fail(`${f} missing in dist/`);
}
if (failed) process.exit(1);

const digest = (file, algo, enc) => crypto.createHash(algo).update(fs.readFileSync(file)).digest(enc);
const exePath = path.join(DIST, installer);
const yaml = require('js-yaml').load(fs.readFileSync(path.join(DIST, 'latest.yml'), 'utf8'));
const entry = (yaml.files || []).find((f) => f.url === installer);
if (yaml.version !== version) fail(`latest.yml version ${yaml.version} ≠ ${version}`);
else ok(`latest.yml version ${version}`);
if (yaml.path !== installer || !entry) fail(`latest.yml does not point at ${installer}`);
else {
  const size = fs.statSync(exePath).size;
  const sha512 = digest(exePath, 'sha512', 'base64');
  if (entry.size !== size) fail(`latest.yml size ${entry.size} ≠ ${size}`);
  else ok(`latest.yml size ${size}`);
  if (entry.sha512 !== sha512 || yaml.sha512 !== sha512) fail('latest.yml sha512 does not match the installer');
  else ok('latest.yml sha512 matches the installer');
}

const unpacked = path.join(DIST, 'win-unpacked');
for (const f of ['LICENSES.chromium.html', 'LICENSE.electron.txt']) {
  if (fs.existsSync(path.join(unpacked, f))) ok(`${f} next to the executable`);
  else fail(`${f} missing in win-unpacked/`);
}
try {
  const asar = require('@electron/asar');
  const listed = new Set(asar.listPackage(path.join(unpacked, 'resources', 'app.asar')).map((p) => p.replace(/\\/g, '/').replace(/^\//, '')));
  for (const f of ['LICENSE', 'NOTICE.md', 'THIRD_PARTY_NOTICES.md', 'assets/fonts/KFGQPC-LICENSE.txt', 'assets/fonts/KFGQPC-Hafs-V30.ttf', 'assets/soqi/sheet.json', 'src/locales/en.json', 'src/locales/ar.json', 'src/locales/nl.json']) {
    if (listed.has(f)) ok(`packaged: ${f}`);
    else fail(`not packaged: ${f}`);
  }
  for (const f of [...listed].filter((p) => /^(assets\/screenshots|assets\/branding|assets\/mascot|assets\/ui|docs|test|\.github)\//.test(p))) fail(`should not be packaged: ${f}`);
} catch (err) {
  fail(`cannot inspect app.asar: ${err.message}`);
}

const sums = required.map((f) => `${digest(path.join(DIST, f), 'sha256', 'hex')}  ${f}`).join('\n') + '\n';
fs.writeFileSync(path.join(DIST, 'SHA256SUMS.txt'), sums);
ok('SHA256SUMS.txt written');
console.log('signing: not configured (unsigned installer; SmartScreen will warn)');
console.log(failed ? `${failed} problem(s)` : 'release check passed');
process.exit(failed ? 1 : 0);
