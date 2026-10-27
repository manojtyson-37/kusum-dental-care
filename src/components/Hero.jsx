import { Phone } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const WA_URL = "https://wa.me/918431907976?text=Hi%20Dr.%20Kusum's%20Dental%20Care%2C%20I%20would%20like%20to%20schedule%20an%20appointment.";

const LEGEND_ITEMS = [
  {
    tag: 'Equip',
    title: 'Modern equipment',
    desc: 'Advanced dental tech for precision & comfort',
  },
  {
    tag: 'Hours',
    title: 'Open 7 days a week',
    desc: 'Mon–Sun, 9:30 AM – 9:00 PM',
  },
  {
    tag: 'Comfort',
    title: 'Gentle, comfort-focused care',
    desc: 'Care designed for anxious patients',
  },
];

function ToothDraw() {
  return (
    <div className="hero__tooth-stage">
      <span className="hero__tooth-glow" aria-hidden="true" />
      <img
        src="/Dental_logo_transparent.png"
        alt="Dr. Kusum's Dental Care logo"
        className="hero__tooth-logo"
      />
    </div>
  );
}

const BG_PHOTOS = [
  '/gallery/dental-1.webp',
  '/gallery/dental-3.jpg',
  '/gallery/dental-2.webp',
];

export default function Hero() {
  const { t } = useLang();
  return (
    <section className="hero" id="home" aria-label="Dr. Kusum's Dental Care Hero">
      <div className="hero__bg-photos" aria-hidden="true">
        {BG_PHOTOS.map((src) => (
          <div key={src} className="hero__bg-photo" style={{ backgroundImage: `url(${src})` }} />
        ))}
      </div>
      <div className="hero__bg-overlay" aria-hidden="true" />
      <div className="container">
        <div className="hero__inner">
          {/* Content */}
          <div className="hero__content">
            <h1 className="hero__title">
              <span className="hero__title-word" style={{ animationDelay: '0.05s' }}>{t("Your")}</span>{' '}
              <span className="hero__title-word" style={{ animationDelay: '0.16s' }}>{t("Smile,")}</span>{' '}
              <span className="hero__title-word" style={{ animationDelay: '0.27s' }}>{t("Our")}</span>{' '}
              <span className="hero__title-word hero__title-word--accent" style={{ animationDelay: '0.4s' }}>{t("Expertise")}</span>
            </h1>

            <p className="hero__subtitle">
              {t("Dr. Kusum's Dental Care is a multi-specialty dental clinic & implant center in Malleshpalya, Bangalore, delivering quality dental treatment with a gentle touch.")}
            </p>

            <div className="hero__actions">
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" id="hero-book-btn">
                {t("Book Appointment")}
              </a>
              <a href="tel:+918431907976" className="btn btn-outline" id="hero-call-btn">
                <Phone size={16} />
                {t("Call Now")}
              </a>
            </div>

            <div className="hero__trust">
              <div className="hero__trust-item">
                <span className="hero__trust-num">15+</span>
                <span className="hero__trust-label">{t("Years Experience")}</span>
              </div>
              <div className="hero__trust-divider" aria-hidden="true" />
              <div className="hero__trust-item">
                <span className="hero__trust-num">5000+</span>
                <span className="hero__trust-label">{t("Happy Patients")}</span>
              </div>
              <div className="hero__trust-divider" aria-hidden="true" />
              <div className="hero__trust-item">
                <span className="hero__trust-num">7</span>
                <span className="hero__trust-label">{t("Specialties")}</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="hero__visual">
            <div className="hero__tooth-card" aria-hidden="true">
              <span className="hero__tooth-tag">{t("Trusted dental care")}</span>
              <ToothDraw />
            </div>

            <div className="hero__legend">
              {LEGEND_ITEMS.map((item, i) => (
                <div
                  className="hero__legend-item"
                  key={item.tag}
                  style={{ animationDelay: `${1.1 + i * 0.12}s` }}
                >
                  <span className="hero__legend-tag">{t(item.tag)}</span>
                  <div>
                    <div className="hero__legend-title">{t(item.title)}</div>
                    <div className="hero__legend-desc">{t(item.desc)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
