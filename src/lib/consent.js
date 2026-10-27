// Cookie/optional-content consent. The site itself sets no tracking cookies;
// the only optional third-party content is the Google Maps embed, which stays
// unloaded until the visitor allows it. Choice lives in localStorage.
const KEY = 'kdc_consent_v1';
const EVENT = 'kdc-consent-change';

export function getConsent() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked — choice just won't persist */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onConsentChange(cb) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
