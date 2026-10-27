import { useEffect, useRef } from 'react';
import { useLang } from '../i18n/LangContext';

/*
 * Judgment call: the repo has no individual doctor headshot photo or a
 * distinct named bio for Dr. Kusum beyond the practice-level copy already
 * used in the Hero/About sections. Rather than invent credentials or a
 * portrait, this "practice intro" block reuses the clinic's own real copy
 * (multi-specialty description, clinic
 * photo) reframed as a trust-building introduction — the Jackson-style
 * "meet the dentist" slot, filled with what's actually true of the practice.
 */

export default function DentistIntro() {
  const { t } = useLang();
  const sectionRef = useRef(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal, .reveal-slide-left, .reveal-slide-right, .reveal-tilt') || [];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="dentist-intro section-pad" id="practice" ref={sectionRef} aria-labelledby="dentist-intro-title">
      <div className="container">
        <div className="dentist-intro__inner">
          <div className="dentist-intro__visual reveal-tilt">
            <div className="dentist-intro__photo-card">
              <img
                src="/gallery/dental-3.jpg"
                alt="Treatment room at Dr. Kusum's Dental Care"
                loading="lazy"
              />
            </div>
          </div>

          <div className="dentist-intro__content">
            <h2 className="section-title reveal-slide-right" id="dentist-intro-title" style={{ transitionDelay: '0.05s' }}>
              {t("A Multi-Specialty Clinic Built Around You")}
            </h2>
            <p className="section-subtitle reveal-slide-right" style={{ transitionDelay: '0.1s' }}>
              {t("Dr. Kusum's Dental Care is a multi-specialty dental clinic & implant center in Malleshpalya, Bangalore, delivering quality dental treatment with a gentle touch. We combine the latest dental technology with compassionate care, and our team has been transforming smiles across Bangalore with precision, warmth, and expertise.")}
            </p>

          </div>
        </div>
      </div>
    </section>
  );
}
