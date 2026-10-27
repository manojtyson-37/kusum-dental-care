import { useState, useEffect } from 'react';
import { SHOW_VIRTUAL_TOUR } from '../lib/features';
import { Link } from 'react-router-dom';
import { Phone, Menu, X } from 'lucide-react';
import LangSwitch from './LangSwitch';
import { useLang } from '../i18n/LangContext';

const WA_URL = "https://wa.me/918431907976?text=Hi%20Dr.%20Kusum's%20Dental%20Care%2C%20I%20would%20like%20to%20schedule%20an%20appointment.";

export default function Header() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Escape closes the mobile menu and returns focus to the toggle button.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setMenuOpen(false); document.querySelector('.header__hamburger')?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const navLinks = [
    { label: 'Services', href: '#services' },
    ...(SHOW_VIRTUAL_TOUR ? [{ label: 'Virtual Tour', href: '/tour' }] : []),
    { label: 'About Us', href: '#about' },
    { label: 'Timings', href: '#timings' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <>
      <header className={`header${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <div className="header__inner">
            {/* Logo */}
            <Link to="/" className="header__logo" aria-label="Dr. Kusum's Dental Care - Home">
              <div className="header__logo-icon">
                <img src="/logo-mark.png" alt="" className="header__logo-img" />
              </div>
              <div className="header__logo-text">
                <span className="header__logo-name">Dr. Kusum's Dental Care</span>
                <span className="header__logo-sub">{t("Multi-specialty & Implant Center")}</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="header__nav" aria-label="Main navigation">
              {navLinks.map(link => (
                link.href.startsWith('/') ? (
                  <Link key={link.href} to={link.href}>{t(link.label)}</Link>
                ) : (
                  <a key={link.href} href={link.href}>{t(link.label)}</a>
                )
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="header__actions">
              <LangSwitch />
              <div className="header__phones">
                <div className="header__phone">
                  <Phone size={13} />
                  <a href="tel:+918431907976">+91 84319 07976</a>
                </div>
                <div className="header__phone">
                  <Phone size={13} />
                  <a href="tel:+918123107976">+91 81231 07976</a>
                </div>
              </div>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" id="header-book-btn">
                {t("Book Appointment")}
              </a>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="header__hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t("Toggle navigation menu")}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu${menuOpen ? ' open' : ''}`} role="navigation">
          {navLinks.map(link => (
            link.href.startsWith('/') ? (
              <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)}>{t(link.label)}</Link>
            ) : (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{t(link.label)}</a>
            )
          ))}
          <div className="mobile-menu__lang"><LangSwitch /></div>
          <a href="tel:+918431907976" className="mobile-menu__phone">
            <Phone size={14} />
            +91 84319 07976
          </a>
          <a href="tel:+918123107976" className="mobile-menu__phone">
            <Phone size={14} />
            +91 81231 07976
          </a>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
            {t("Book Appointment on WhatsApp")}
          </a>
        </div>
      </header>
    </>
  );
}
