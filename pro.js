/* Pro unlock: one-time Google Play purchase that opens the full ASE bank, full exams and the mock.
   Editions:
     'play' - the Android app; purchases go through Google Play Billing (NativePurchases plugin).
     'demo' - the public web demo (built by scripts/build-demo.mjs); ships only the free sample.
     'web'  - running from the repo (development and tests). Pro can be forced with
              localStorage 'carquiz.pro.dev' = '1'; this has no effect in the other editions. */
(() => {
  'use strict';

  const PRODUCT_ID = 'pro_unlock';
  const KEY = 'carquiz.pro.v1';
  const DEV_KEY = 'carquiz.pro.dev';
  const STORE_URL = 'https://play.google.com/store/apps/details?id=io.github.phacharapol18.carquiz';

  const cap = window.Capacitor;
  const native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  const billing = native && cap.Plugins ? cap.Plugins.NativePurchases : null;
  const edition = window.CARQUIZ_EDITION === 'demo' ? 'demo' : billing ? 'play' : 'web';

  const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

  let pro = edition === 'play' ? read(KEY) === '1' : edition === 'web' && read(DEV_KEY) === '1';
  let price = null;
  const listeners = [];

  function setPro(value) {
    value = !!value;
    if (edition === 'play') write(KEY, value ? '1' : null);
    if (value === pro) return;
    pro = value;
    listeners.forEach((fn) => { try { fn(pro); } catch { /* keep notifying */ } });
  }

  const owns = (list) => (list || []).some((t) => t && t.productIdentifier === PRODUCT_ID && String(t.purchaseState) === '1');

  // Check the store: confirm or revoke the cached unlock (refunds drop out of getPurchases).
  // If Google Play can't be reached, keep the cached state so Pro still works offline.
  async function refresh() {
    if (edition !== 'play') return;
    try {
      const { products } = await billing.getProducts({ productIdentifiers: [PRODUCT_ID], productType: 'inapp' });
      if (products && products[0] && products[0].priceString) price = products[0].priceString;
    } catch { /* price stays unknown; the button shows a generic label */ }
    try {
      const { purchases } = await billing.getPurchases({ productType: 'inapp' });
      setPro(owns(purchases));
    } catch { /* offline or billing unavailable */ }
  }

  if (edition === 'play' && billing.addListener) {
    // Pending purchases (e.g. cash payments) complete later and arrive here.
    billing.addListener('transactionUpdated', (t) => { if (owns([t])) setPro(true); });
  }

  const ready = refresh().then(() => listeners.forEach((fn) => { try { fn(pro); } catch { /* ignore */ } }));

  async function buy() {
    if (edition !== 'play') {
      window.open(STORE_URL, '_blank', 'noopener');
      return 'store';
    }
    try {
      const t = await billing.purchaseProduct({ productIdentifier: PRODUCT_ID, productType: 'inapp' });
      if (owns([t])) { setPro(true); return 'purchased'; }
      if (t && String(t.purchaseState) === '0') return 'pending';
      return 'error';
    } catch (err) {
      const msg = String((err && (err.message || err.code)) || err);
      if (/cancel/i.test(msg)) return 'cancelled';
      if (/already.?owned|ITEM_ALREADY_OWNED/i.test(msg)) { await refresh(); return pro ? 'purchased' : 'error'; }
      return 'error';
    }
  }

  async function restore() {
    if (edition !== 'play') return false;
    try { if (billing.restorePurchases) await billing.restorePurchases(); } catch { /* Android relies on getPurchases */ }
    try {
      const { purchases } = await billing.getPurchases({ productType: 'inapp' });
      setPro(owns(purchases));
      return true;
    } catch { return false; }
  }

  // The public web demo points players to the full app.
  if (edition === 'demo') {
    const bar = document.createElement('a');
    bar.className = 'demo-bar';
    bar.href = STORE_URL;
    bar.target = '_blank';
    bar.rel = 'noopener';
    bar.innerHTML = '<span>Free web demo</span> <b>Get the full app on Google Play →</b>';
    const mount = () => document.body.prepend(bar);
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  }

  window.CarQuizPro = {
    edition,
    storeUrl: STORE_URL,
    productId: PRODUCT_ID,
    ready,
    isPro: () => pro,
    price: () => price,
    onChange(fn) { listeners.push(fn); },
    buy,
    restore,
  };
})();
