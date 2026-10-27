import { useEffect, useRef } from 'react';
import { MapPin, Clock, Phone, Navigation, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const WA_URL = "https://wa.me/918431907976?text=Hi%20Dr.%20Kusum's%20Dental%20Care%2C%20I%20would%20like%20to%20schedule%20an%20appointment.";

export default function About() {
  const { t } = useLang();
  const sectionRef = useRef(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal, .reveal-tilt') || [];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="about section-pad" id="about" ref={sectionRef} aria-labelledby="about-title">
      <div className="container">
        <div className="about__inner">
          {/* Left – About Text & Features */}
          <div>
            <h2 className="section-title" id="about-title" style={{ maxWidth: '440px' }}>
              {t("Dental Care You Can Trust")}
            </h2>
            <p className="section-subtitle">
              {t("At Dr. Kusum's Dental Care, we combine the latest dental technology with compassionate care. Our Malleshpalya clinic has been transforming smiles across Bangalore with precision, warmth, and expertise.")}
            </p>
          </div>

          {/* Right – Clinic Info Cards */}
          <div className="about__info-panel" id="timings">
            {/* Location */}
            <div className="info-card reveal-tilt tilt-3d" id="contact">
              <div className="info-card__header">
                <div className="info-card__icon" aria-hidden="true">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="info-card__title">{t("Our Location")}</h3>
                  <span className="info-card__tag">{t("Malleshpalya • East Bangalore")}</span>
                </div>
              </div>
              <div className="info-card__body">
                <div className="info-card__address">
                  <strong>Dr. Kusum's Dental Care</strong>
                  <p>{t("17, 5th Main, 2nd Cross, Malleshpalya, Bangalore – 560075")}</p>
                </div>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=12.9751706,77.6733556"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="info-card__action-btn"
                >
                  <Navigation size={15} />
                  <span>{t("Get Directions")}</span>
                  <ArrowRight size={14} className="info-card__arrow" />
                </a>
              </div>
            </div>

            {/* Timings */}
            <div className="info-card reveal-tilt tilt-3d" style={{ transitionDelay: '0.12s' }}>
              <div className="info-card__header">
                <div className="info-card__icon" aria-hidden="true">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="info-card__title">{t("Clinic Timings")}</h3>
                  <span className="info-card__tag info-card__tag--emerald">{t("Open 7 Days a Week")}</span>
                </div>
              </div>
              <div className="info-card__body">
                <div className="info-card__timing-list">
                  <div className="info-card__timing-item">
                    <span className="info-card__timing-day">{t("Monday – Saturday")}</span>
                    <span className="info-card__timing-hours">9:30 AM – 9:00 PM</span>
                  </div>
                  <div className="info-card__timing-item info-card__timing-item--sunday">
                    <span className="info-card__timing-day">
                      <span className="info-card__status-dot" aria-hidden="true" />
                      {t("Sunday")}
                    </span>
                    <span className="info-card__timing-hours">9:30 AM – 9:00 PM</span>
                  </div>
                </div>

                <div className="info-card__pill-note">
                  <CheckCircle2 size={15} className="info-card__pill-icon" />
                  <span>{t("Walk-ins welcome • Emergency care available")}</span>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="info-card reveal-tilt tilt-3d" style={{ transitionDelay: '0.24s' }}>
              <div className="info-card__header">
                <div className="info-card__icon" aria-hidden="true">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="info-card__title">{t("Contact & Bookings")}</h3>
                  <span className="info-card__tag">{t("Quick Consultation")}</span>
                </div>
              </div>
              <div className="info-card__body">
                <div className="info-card__phones">
                  <a href="tel:+918431907976" className="info-card__phone-card" id="contact-phone1">
                    <div className="info-card__phone-icon">
                      <Phone size={14} />
                    </div>
                    <div className="info-card__phone-text">
                      <span className="info-card__phone-num">+91 84319 07976</span>
                      <span className="info-card__phone-label">{t("Primary Call / Appointments")}</span>
                    </div>
                  </a>
                  <a href="tel:+918123107976" className="info-card__phone-card" id="contact-phone2">
                    <div className="info-card__phone-icon">
                      <Phone size={14} />
                    </div>
                    <div className="info-card__phone-text">
                      <span className="info-card__phone-num">+91 81231 07976</span>
                      <span className="info-card__phone-label">{t("Alternate Clinic Line")}</span>
                    </div>
                  </a>
                </div>

                <div className="info-card__wa-wrap">
                  <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="info-card__wa-btn"
                    id="about-whatsapp-btn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.878L0 24l6.31-1.508A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.034-1.381l-.36-.214-3.718.889.923-3.619-.233-.368A9.818 9.818 0 1112 21.818z"/>
                    </svg>
                    <span>{t("Chat on WhatsApp")}</span>
                    <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
