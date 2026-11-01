// Smart clipboard toasts: what was just copied, and one click to act on it.
(() => {
  let idmOnline = false;
  bridge.onDownloads((p) => { idmOnline = !!p?.online && !p?.outdated; });

  bridge.onClipSmart((s) => {
    if (!feat('smartClipboard') || cardShowing()) return;
    switch (s.type) {
      case 'url': {
        const dl = idmOnline;
        showToast('clip-url', s.host, dl ? t('clip.download') : t('clip.open'), 0, 5000);
        state.toastAction = () => bridge.clipAction(dl ? 'download' : 'open');
        break;
      }
      case 'color':
        island.style.setProperty('--sw', s.color);
        showToast('clip-color', s.color, '', 0, 3000);
        break;
      case 'math':
        showToast('clip-math', `${s.expr} =`, s.result, 0, 6000);
        state.toastAction = () => {
          bridge.clipAction('copy');
          showToast('done', t('clip.copied'), s.result, 0, 1400);
        };
        break;
      case 'text':
        showToast('clip-text', t('clip.words', { n: s.words.toLocaleString(LOCALE()) }), t('clip.chars', { n: s.chars.toLocaleString(LOCALE()) }), 0, 2600);
        break;
      default:
        break;
    }
  });
})();
