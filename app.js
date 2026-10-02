/* Shared app shell: Android back button, offline support, haptics.
   Works in the browser, as an installed PWA, and inside the Capacitor Android app. */
(() => {
  'use strict';

  const native = window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
  const plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
  const backHandlers = [];

  // Pages register a handler that returns true when it consumed the back press
  // (closed a dialog, left a quiz, returned to a menu).
  function onBack(handler) { backHandlers.push(handler); }

  function back() {
    for (const h of backHandlers.slice().reverse()) {
      try { if (h()) return; } catch { /* keep going */ }
    }
    if (!/(^|\/)(index\.html)?$/.test(location.pathname)) { location.href = 'index.html'; return; }
    if (native && plugins.App) plugins.App.exitApp();
  }

  if (native && plugins.App && plugins.App.addListener) {
    plugins.App.addListener('backButton', back);
    document.documentElement.classList.add('is-native');
  }

  function buzz(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* unsupported */ }
  }

  // Offline cache for the web build. The native app ships its files in the APK.
  if (!native && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    });
  }

  window.CarQuizApp = { native, onBack, back, buzz };
})();
