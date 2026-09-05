initFirebase();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

// Android/Chrome/Edge: capture the native install prompt and offer a button
// for it, since the browser won't show its own UI once we've called
// preventDefault() on the event.
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('install-app-btn').style.display = 'block';
});

document.getElementById('install-app-btn').addEventListener('click', async () => {
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-app-btn').style.display = 'none';
});

window.addEventListener('appinstalled', () => {
  document.getElementById('install-app-btn').style.display = 'none';
});

// iOS Safari has no beforeinstallprompt/install API at all - the only way to
// install is the manual Share -> Add to Home Screen flow, so just point to it.
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
if(isIOS && !isStandalone){
  document.getElementById('ios-install-hint').style.display = 'block';
}
