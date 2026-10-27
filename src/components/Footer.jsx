import { Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapEmbed from './MapEmbed';
import { setConsent } from '../lib/consent';
import { useLang } from '../i18n/LangContext';

const WA_URL = "https://wa.me/918431907976?text=Hi%20Dr.%20Kusum's%20Dental%20Care%2C%20I%20would%20like%20to%20schedule%20an%20appointment.";

const quickLinks = [
  { label: 'Root Canal', href: '#services' },
  { label: 'Dental Implants', href: '#services' },
  { label: 'Cosmetic Dentistry', href: '#services' },
  { label: 'Braces & Aligners', href: '#services' },
  { label: 'Gum Surgery', href: '#services' },
  { label: 'Dentures', href: '#services' },
];

export default function Footer() {
  const { t } = useLang();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" id="map" aria-label="Footer">
      <div className="container">
        {/* Google Maps Embed */}
        <div className="footer__map" aria-label="Clinic location on Google Maps">
          <MapEmbed />
        </div>

        {/* Footer Content */}
        <div className="footer__inner">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <div className="footer__logo-icon">
                <img src="/Dental_logo2.jpeg" alt="" className="footer__logo-img" />
              </div>
              <div>
                <div className="footer__logo-name">Dr. Kusum's Dental Care</div>
                <div className="footer__logo-sub">{t("Multi-specialty & Implant Center")}</div>
              </div>
            </div>
            <p className="footer__tagline">
              {t("Delivering quality dental care in Malleshpalya, Bangalore. Your smile is our greatest reward.")}
            </p>
            <div className="footer__phones">
              <a href="tel:+918431907976" className="footer__phone">
                <Phone size={14} />
                +91 84319 07976
              </a>
              <a href="tel:+918123107976" className="footer__phone">
                <Phone size={14} />
                +91 81231 07976
              </a>
            </div>
            <div style={{ marginTop: '8px' }}>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '11px 22px' }}
                id="footer-book-btn"
              >
                {t("Book on WhatsApp")}
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="footer__col-title">{t("Services")}</h3>
            <nav className="footer__links" aria-label="Services links">
              {quickLinks.map(l => (
                <a key={l.label} href={l.href}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  {t(l.label)}
                </a>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h3 className="footer__col-title">{t("Legal")}</h3>
            <nav className="footer__links" aria-label="Legal links">
              <Link to="/privacy">{t("Privacy Policy")}</Link>
              <Link to="/terms">{t("Terms of Service")}</Link>
              <Link to="/refund">{t("Refund Policy")}</Link>
              <Link to="/cookies">{t("Cookie Policy")}</Link>
              <Link to="/data-request">{t("Data Request")}</Link>
              <Link to="/licenses">{t("Licences & Credits")}</Link>
              <button type="button" onClick={() => setConsent(null)}>{t("Cookie Settings")}</button>
            </nav>
          </div>

          {/* Visit Info */}
          <div>
            <h3 className="footer__col-title">{t("Visit Us")}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t("Address")}</p>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.82)', lineHeight: '1.6' }}>
                  {t("17, 5th Main, 2nd Cross, Malleshpalya, Bangalore – 560075")}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t("Timings")}</p>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.82)', lineHeight: '1.6' }}>
                  {t("Mon – Sat: 9:30 AM – 9:00 PM")}<br />
                  {t("Sunday")}: <span style={{ color: '#4DB6AC' }}>{t("Open")}</span> · {t("9:30 AM – 9:00 PM")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign-off */}
        <div className="footer__signoff">
          <span className="footer__signoff-title">Dr. Kusum's Dental Care</span>
          <a href="tel:+918431907976" className="footer__signoff-email">
            +91 84319 07976
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="footer__bottom">
          <span>© {currentYear} {t("Dr. Kusum's Dental Care")}, {t("Bangalore")}. {t("All rights reserved.")}</span>
          <span>{t("17, 5th Main, 2nd Cross, Malleshpalya, Bangalore – 560075")}</span>
        </div>
      </div>
    </footer>
  );
}
