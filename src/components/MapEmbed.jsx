import { useEffect, useState } from 'react';
import { getConsent, setConsent, onConsentChange } from '../lib/consent';
import { useLang } from '../i18n/LangContext';

const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d980!2d77.6733556!3d12.9751706!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae11e018c0bea1%3A0xe90495d2bc3625ee!2sDr%20Kusum's%20Dental%20Care!5e0!3m2!1sen!2sin!4v1700000000001!5m2!1sen!2sin";
const DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=12.9751706,77.6733556';

// Google Maps sets cookies and receives the visitor's IP on load, so the
// iframe is only rendered once optional content has been allowed.
export default function MapEmbed() {
  const { t } = useLang();
  const [consent, setConsentState] = useState(() => getConsent());

  useEffect(() => onConsentChange(() => setConsentState(getConsent())), []);

  if (consent === 'accepted') {
    return (
      <iframe
        title="Dr. Kusum's Dental Care Location – Malleshpalya, Bangalore"
        src={MAP_SRC}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <div className="map-placeholder">
      <p>{t("The map is provided by Google. Loading it lets Google set cookies and see your IP address.")}</p>
      <div className="map-placeholder__actions">
        <button type="button" className="map-placeholder__btn" onClick={() => setConsent('accepted')}>
          {t("Load map")}
        </button>
        <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
          {t("Open in Google Maps")}
        </a>
      </div>
    </div>
  );
}
