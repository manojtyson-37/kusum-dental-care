import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent, onConsentChange } from '../lib/consent';
import { useLang } from '../i18n/LangContext';

export default function CookieBanner() {
  const { t } = useLang();
  const [choice, setChoice] = useState(() => getConsent());

  useEffect(() => onConsentChange(() => setChoice(getConsent())), []);

  if (choice) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent" aria-live="polite">
      <p className="cookie-banner__text">
        {t("We use no tracking or advertising cookies. The clinic map is provided by Google and only loads if you allow optional content. See our")}{' '}
        <Link to="/cookies">{t("Cookie Policy")}</Link> {t("and")} <Link to="/privacy">{t("Privacy Policy")}</Link>.
      </p>
      <div className="cookie-banner__actions">
        <button type="button" className="cookie-banner__btn cookie-banner__btn--ghost" onClick={() => setConsent('declined')}>
          {t("Decline")}
        </button>
        <button type="button" className="cookie-banner__btn" onClick={() => setConsent('accepted')}>
          {t("Allow optional content")}
        </button>
      </div>
    </div>
  );
}
