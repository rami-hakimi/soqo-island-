// `node --check` over every tracked script: catches a syntax error in a classic renderer
// script before Electron would silently stop loading the page.
const { execFileSync } = require('child_process');
const files = execFileSync('git', ['ls-files', '*.js', '**/*.js'], { encoding: 'utf8' }).split('\n').filter(Boolean);
let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad++; console.error(String(e.stderr)); }
}
console.log(`${files.length - bad}/${files.length} scripts parse`);
process.exit(bad ? 1 : 0);
