// Network companion: a toast when Wi-Fi connects, the internet drops, or it comes back (with how
// long it was gone), and the current connection in the System tab.
(() => {
  let downAt = 0;

  const label = (n) => (n.link === 'wifi' ? t('net.wifi') : n.link === 'ethernet' ? t('net.ethernet') : t('net.offline'));
  const ago = (ms) => {
    const m = Math.round(ms / 60000);
    return m < 1 ? t('net.afterSec') : m < 60 ? t('net.afterMin', { m }) : t('net.afterH', { h: Math.floor(m / 60), m: m % 60 });
  };

  function row(n) {
    const off = n.link === 'none' || n.internet === false;
    $('#net-row').classList.toggle('off', off);
    $('#net-val').textContent = n.link !== 'none' && n.internet === false ? t('net.noInternet', { link: label(n) }) : label(n);
  }

  function update(n) {
    row(n);
    const p = n.prev;
    // the first reading after start is not news
    if (!p || p.internet === null || !feat('netToasts')) return;
    if (p.internet && n.internet === false) {
      downAt = Date.now();
      island.classList.add('net-down');
      setTimeout(() => island.classList.remove('net-down'), 4600);
      showToast('net-off', n.link === 'none' ? t('net.noConnection') : t('net.lost'), '', 0, 4500);
      note('📡', t('net.lost'));
      window.soqi?.react('warning');
    } else if (p.internet === false && n.internet) {
      const gone = downAt ? Date.now() - downAt : 0;
      showToast('net-on', t('net.back'), gone ? ago(gone) : label(n), 0, 3500);
      window.soqi?.react('happy', 3500);
      note('📶', gone ? t('net.noteBack', { ago: ago(gone) }) : t('net.back'));
      downAt = 0;
    } else if (n.link === 'wifi' && p.link !== 'wifi' && n.internet) {
      showToast('net-on', t('net.wifiConnected'), '', 0, 3000);
    }
  }

  let lastNet = null;
  window.addEventListener('island:i18n', () => lastNet && row(lastNet));
  bridge.onNetwork((n) => { lastNet = n; update(n); });
  bridge.network().then((n) => { if (n) { lastNet = n; row(n); } });
})();
