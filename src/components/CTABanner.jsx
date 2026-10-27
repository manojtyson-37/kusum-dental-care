import { useEffect, useRef } from 'react';
import { Phone } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const WA_URL = "https://wa.me/918431907976?text=Hi%20Dr.%20Kusum's%20Dental%20Care%2C%20I%20would%20like%20to%20schedule%20an%20appointment.";

export default function CTABanner() {
  const { t } = useLang();
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) el.classList.add('in-view'); }),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="cta-banner" id="cta-banner" ref={sectionRef} aria-labelledby="cta-title">
      <div className="cta-banner__bg-photo" aria-hidden="true" style={{ backgroundImage: 'url(/gallery/dental-3.jpg)' }} />
      <div className="cta-banner__bg-overlay" aria-hidden="true" />
      <div className="cta-banner__bg-shape" aria-hidden="true" />
      <div className="cta-banner__bg-shape cta-banner__bg-shape--2" aria-hidden="true" />
      <div className="container">
        <div className="cta-banner__inner">
          <div className="cta-banner__content">
            <div className="cta-banner__icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h2 className="cta-banner__title" id="cta-title">
              {t("Ready to Transform Your Smile?")}
            </h2>
            <p className="cta-banner__subtitle">
              {t("Book your appointment today. Open 7 days a week, including Sundays. Trusted by 5,000+ patients across Bangalore.")}
            </p>
          </div>

          <div className="cta-banner__actions">
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-white" id="cta-book-btn">
              {t("Book Appointment")}
            </a>
            <a href="tel:+918431907976" className="cta-banner__call" id="cta-call-btn">
              <Phone size={16} />
              +91 84319 07976
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
