// Copied image / screenshot: a toast with the thumbnail. With "Save screenshots to Shelf" on, main
// already put it on the Shelf for a while ("Added to Shelf ✓", a click opens the Shelf);
// otherwise clicking saves it to Pictures\Soqo Island and puts it on the Shelf.
(() => {
  bridge.onScreenshot((s) => {
    $('.t-shot').src = s.thumb;
    window.soqi?.react('notification');
    const portrait = s.height > s.width;
    if (s.auto) {
      showToast('shot-auto', portrait ? t('shot.imageSaved') : t('shot.saved'), t('shot.addedToShelf'), 0, 4500);
      state.toastAction = () => {
        selectTab('shelf');
        state.hover = true;
        render();
      };
      return;
    }
    showToast('shot', portrait ? t('shot.imageCopied') : t('shot.copied'), feat('tabShelf') ? t('shot.addToShelf') : '', 0, 6000);
    if (feat('tabShelf')) state.toastAction = () => bridge.shotToShelf();
  });
  bridge.onShotSaved((s) => showToast('shot-saved', s.name, t('shot.onShelf'), 0, 2600));
})();
