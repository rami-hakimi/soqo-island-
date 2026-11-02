const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => ipcRenderer.on(channel, (_e, data) => cb(data));

contextBridge.exposeInMainWorld('focusMode', {
  i18n: ipcRenderer.sendSync('i18n-get-sync'),
  onI18n: on('i18n'),
  timer: () => ipcRenderer.invoke('focus-timer'),
  onTimer: on('timer'),
  features: () => ipcRenderer.invoke('features-get'),
  // a coding agent needs the user (only when Settings allow alerts in Focus Mode)
  onAgentAlert: on('agent-alert'),
  openAgent: (key) => ipcRenderer.send('agents-open', key),
  // 'toggle' | 'cancel' | 'session' | 'exit' | { start: minutes }
  cmd: (c) => ipcRenderer.send('focus-cmd', c),
});
