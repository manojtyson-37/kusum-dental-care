import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const PHOTOS = [
  {
    src: '/gallery/dental-1.webp',
    alt: "Reception area at Dr. Kusum's Dental Care",
    caption: 'A calm space to start your visit',
    tag: 'Reception',
  },
  {
    src: '/gallery/dental-3.jpg',
    alt: "Treatment room at Dr. Kusum's Dental Care",
    caption: 'Modern equipment, sterilized between every patient',
    tag: 'Treatment Room',
  },
  {
    src: '/gallery/dental-2.webp',
    alt: "Storefront of Dr. Kusum's Dental Care in Malleshpalya",
    caption: 'Find us on 5th Main, Malleshpalya',
    tag: 'Our Clinic',
  },
];

export default function Gallery() {
  const { t } = useLang();
  const sectionRef = useRef(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const closeBtnRef = useRef(null);
  const openerRef = useRef(null);

  // Lightbox keyboard support: Escape closes, focus moves into the dialog
  // (Tab is kept inside it) and returns to the thumbnail that opened it.
  useEffect(() => {
    if (!activePhoto) return undefined;
    closeBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setActivePhoto(null);
      if (e.key === 'Tab') { e.preventDefault(); closeBtnRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openerRef.current?.focus?.();
    };
  }, [activePhoto]);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal-zoom') || [];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 },
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="gallery section-pad" ref={sectionRef} id="gallery" aria-labelledby="gallery-title">
      <div className="container">
        <header className="gallery__header">
          <h2 className="section-title" id="gallery-title">{t("Inside Dr. Kusum's Clinic")}</h2>
          <p className="section-subtitle">
            {t("Take a visual tour through our clinic spaces in Malleshpalya. Designed around strict sterilization, modern diagnostics and patient comfort.")}
          </p>
        </header>

        <div className="gallery__grid">
          {PHOTOS.map((photo, i) => (
            <figure
              className="gallery__item reveal-zoom"
              key={photo.src}
              style={{ transitionDelay: `${i * 0.15}s` }}
              onClick={(e) => { openerRef.current = e.currentTarget; setActivePhoto(photo); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openerRef.current = e.currentTarget;
                  setActivePhoto(photo);
                }
              }}
              aria-label={`View photo of ${photo.tag}`}
            >
              <div className="gallery__item-media">
                <img src={photo.src} alt={photo.alt} loading="lazy" />
                <div className="gallery__item-zoom-badge" aria-hidden="true">
                  <ZoomIn size={14} />
                  <span>{t("Expand")}</span>
                </div>
              </div>
              <figcaption>
                <span className="gallery__item-tag">{t(photo.tag)}</span>
                {t(photo.caption)}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* Crystal Clear Lightbox Modal */}
      {activePhoto && (
        <div
          className="gallery-modal-backdrop"
          onClick={() => setActivePhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.tag}
        >
          <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="gallery-modal-close"
              ref={closeBtnRef}
              onClick={() => setActivePhoto(null)}
              aria-label={t("Close photo preview")}
            >
              <X size={20} />
            </button>
            <div className="gallery-modal-img-wrap">
              <img src={activePhoto.src} alt={activePhoto.alt} className="gallery-modal-img" />
            </div>
            <div className="gallery-modal-caption">
              <span className="gallery-modal-tag">{t(activePhoto.tag)}</span>
              <p className="gallery-modal-text">{t(activePhoto.caption)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
