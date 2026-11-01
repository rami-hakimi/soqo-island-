// Loaded with `node --require` before every test file: routes require('electron') to the stub.
const Module = /** @type {any} */ (require('module'));
const stub = require('./electron-stub');
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'electron') return stub;
  return load.call(this, request, ...rest);
};
