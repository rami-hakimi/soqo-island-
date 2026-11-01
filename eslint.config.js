// Flat config. The island renderer is a set of classic scripts that share globals on purpose
// (renderer.js defines them, views/*.js use them); they are declared here rather than rewritten.
const js = require('@eslint/js');
const globals = require('globals');

const islandGlobals = {
  $: 'readonly', $$: 'readonly', bridge: 'readonly', esc: 'readonly', island: 'readonly', state: 'readonly',
  feat: 'readonly', render: 'readonly', lastMode: 'readonly', anchor: 'readonly', showToast: 'readonly',
  selectTab: 'readonly', refreshTabs: 'readonly', positionIsland: 'readonly', wake: 'readonly', celebrate: 'readonly',
  note: 'readonly', happenings: 'readonly', fmt: 'readonly', playTones: 'readonly', focusing: 'readonly',
  compactKind: 'readonly', internalDrag: 'writable', ICON_X: 'readonly', ICON_PLUS: 'readonly', REMINDERS: 'readonly',
  playScene: 'readonly', sceneShowing: 'readonly', endScene: 'readonly', cardShowing: 'readonly', showCard: 'readonly',
  movedKey: 'readonly', SoqiState: 'readonly', Islamic: 'readonly', TimerPill: 'readonly', I18n: 'readonly', I18N: 'writable', t: 'readonly', LOCALE: 'readonly',
};

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'promo/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/renderer/island/renderer.js', 'src/renderer/island/views/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, ...islandGlobals, lastMode: 'writable', anchor: 'writable' } },
    rules: {
      'no-redeclare': 'off',
      // renderer.js defines the shared helpers the views use; reminders-data.js defines REMINDERS
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: `^(${Object.keys(islandGlobals).join('|')}|hasRealArt|current)$` }],
    },
  },
  {
    files: ['src/renderer/prefs/prefs.js', 'src/renderer/mini/mini.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, mini: 'readonly', I18n: 'readonly' } },
    rules: { 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^(LOCALE|t)$' }] },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // UMD: runs as a classic script in the island and as CommonJS in tests
    files: ['src/shared/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, ...globals.node } },
  },
];
