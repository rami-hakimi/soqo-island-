// Writes THIRD_PARTY_NOTICES.md: the licence text of every npm package that ships inside the
// installed application (production dependencies from package-lock.json), plus the notices for
// the code and data that are not npm packages. Packaged with the app.
//   node scripts/third-party-notices.js            write the file
//   node scripts/third-party-notices.js --check    exit 1 if the file is out of date
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');
const lock = require(path.join(ROOT, 'package-lock.json'));
const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'license', 'license.md', 'COPYING'];

// a package that declares MIT in package.json but publishes no licence file gets the MIT text
// with its author as the copyright holder
const MIT = (holder) => `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

function licenseText(dir) {
  for (const f of LICENSE_FILES) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  }
  return null;
}
const author = (pkg) => (typeof pkg.author === 'string' ? pkg.author : pkg.author?.name) || pkg.name;

const packages = Object.entries(lock.packages)
  .filter(([key, v]) => key && !v.dev)
  .map(([key]) => key)
  .sort();

let md = `# Third-party notices

Soqo Island is free software under the GNU General Public License v3.0 (\`LICENSE\`). The
components below are distributed with the application under their own licences. Credits and
the attribution overview are in \`NOTICE.md\`; this file carries the licence texts. Generated
by \`scripts/third-party-notices.js\` from \`package-lock.json\`; do not edit by hand.

## Bundled npm packages
`;
for (const key of packages) {
  const dir = path.join(ROOT, key);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  let text = licenseText(dir);
  let note = '';
  if (!text) {
    if (pkg.license === 'MIT') {
      text = MIT(author(pkg));
      note = ' (the npm package ships no licence file; its package.json declares MIT, reproduced here with the author as copyright holder)';
    } else throw new Error(`${key}: no licence file and not MIT (${pkg.license})`);
  }
  md += `\n### ${pkg.name} ${pkg.version} — ${pkg.license || 'unknown'}${note}\n\n\`\`\`\n${text}\n\`\`\`\n`;
}

md += `
## Code and data that are not npm packages

### PrayTimes.js — GNU LGPL v3.0

The prayer-time calculation core in \`src/main/prayer.js\` is a port of PrayTimes.js, Prayer
Times Calculator v2.3, Copyright (C) 2007-2011 PrayTimes.org (Hamid Zarrabi-Zadeh),
https://praytimes.org. It is combined with this GPL-3.0 program under section 4 of the LGPL;
the complete source of the combined work is this repository. The LGPL v3.0 text follows.

\`\`\`
${fs.readFileSync(path.join(__dirname, 'third-party', 'LGPL-3.0.txt'), 'utf8').trim()}
\`\`\`

### Electron, Chromium, Node.js and the libraries they bundle

Their notices ship inside the installed application next to the executable, as
\`LICENSE.electron.txt\` and \`LICENSES.chromium.html\`.

### KFGQPC HAFS Uthmanic Script v3.0 (font)

Copyright (c) 2010 King Fahd Glorious Quran Printing Complex. Included unmodified under its own
end-user licence agreement, \`assets/fonts/KFGQPC-LICENSE.txt\` (free to use, copy and
distribute; no selling or modification). Not covered by the GPL.

### Open-Meteo (weather and geocoding data)

Weather data by Open-Meteo.com, https://open-meteo.com/, Creative Commons Attribution 4.0
International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/. The free API is used
for non-commercial purposes only.

### Contributor Covenant 2.1

\`CODE_OF_CONDUCT.md\` is adapted from the Contributor Covenant, version 2.1,
https://www.contributor-covenant.org, CC BY 4.0.
`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== md) {
    console.error('✖ THIRD_PARTY_NOTICES.md is out of date: run `npm run notices`');
    process.exit(1);
  }
  console.log(`notices: ${packages.length} packages, THIRD_PARTY_NOTICES.md up to date`);
} else {
  fs.writeFileSync(OUT, md);
  console.log(`notices: ${packages.length} packages written to THIRD_PARTY_NOTICES.md`);
}
