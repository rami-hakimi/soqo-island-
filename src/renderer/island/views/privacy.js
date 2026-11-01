// Mic / camera in use: dots on the island in every shape, a toast naming the app when it starts,
// and a row in the System tab listing who is using what.
(() => {
  let mic = [];
  let cam = [];

  function update(p) {
    const nextMic = p?.mic || [];
    const nextCam = p?.cam || [];
    // a toast only for apps that just started (not on every poll)
    const newCam = nextCam.filter((a) => !cam.includes(a));
    const newMic = nextMic.filter((a) => !mic.includes(a));
    if (newCam.length) showToast('privacy-cam', t('pv.cam', { apps: newCam.join(', ') }), '', 0, 3200);
    else if (newMic.length) showToast('privacy-mic', t('pv.mic', { apps: newMic.join(', ') }), '', 0, 3200);
    if (newCam.length || newMic.length) window.soqi?.react('notification');
    mic = nextMic;
    cam = nextCam;

    island.classList.toggle('pv-mic', mic.length > 0);
    island.classList.toggle('pv-cam', cam.length > 0);
    const parts = [cam.length && t('pv.cameraLabel', { apps: cam.join(', ') }), mic.length && t('pv.micLabel', { apps: mic.join(', ') })].filter(Boolean);
    $('#pv-row').hidden = !parts.length;
    $('#pv-apps').textContent = parts.join(' · ');
  }

  bridge.onPrivacy(update);
})();
