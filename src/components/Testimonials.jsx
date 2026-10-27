import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const GoogleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function StarRating({ count }) {
  return (
    <div className="review-stars" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24"
          fill={i < count ? '#F59E0B' : '#E5E7EB'} aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

// Opens the clinic's own Google Maps listing (reviews included). CID is the
// decimal form of the place's feature id already used in the Footer map embed.
const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps?cid=16790710043077387758';

export default function Testimonials() {
  const { t } = useLang();
  const [liveData, setLiveData] = useState(null);
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef(null);

  /* Fetch live reviews on mount; on any error the section shows only the Google link */
  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (data.reviews?.length) setLiveData(data); })
      .catch(() => {});
  }, []);

  // Only real Google reviews are ever shown — no placeholder/sample testimonials.
  const reviews = useMemo(
    () => (liveData?.reviews ?? []).filter(r => r.text && r.text.trim().length > 0),
    [liveData],
  );
  const hasReviews    = reviews.length > 0;
  const googleRating  = liveData?.rating ?? null;
  const totalReviews  = liveData?.totalReviews ?? null;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => { setActive(0); }, [reviews.length]);

  const goTo = useCallback((i) => {
    if (!reviews.length) return;
    setActive(((i % reviews.length) + reviews.length) % reviews.length);
  }, [reviews.length]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  /* Section-level scroll reveal */
  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal') || [];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
    // Re-run when the carousel mounts (it only renders once real reviews load).
  }, [hasReviews]);

  /* Auto-advance carousel, paused on reduced-motion preference */
  useEffect(() => {
    if (reduceMotion || reviews.length < 2) return undefined;
    const id = setInterval(() => setActive(a => (a + 1) % reviews.length), 6500);
    return () => clearInterval(id);
  }, [reduceMotion, reviews.length]);

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next() : prev());
    touchStartX.current = null;
  }

  return (
    <section className="testimonials section-pad" id="testimonials" ref={sectionRef} aria-labelledby="testimonials-title">
      <div className="container">
        <header className="testimonials__header reveal">
          <h2 className="section-title" id="testimonials-title">
            {t("Smiles That Speak for Themselves")}
          </h2>
          <p className="section-subtitle">
            {t("Real stories from our patients across Bangalore. Discover why families trust Dr. Kusum's Dental Care for their smile transformations.")}
          </p>

          {/* Google Rating Badge */}
          <a
            className="testimonials__badge"
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={googleRating
              ? `Google rating ${googleRating} stars. Read our reviews on Google (opens in a new tab)`
              : 'Read our reviews on Google (opens in a new tab)'}
          >
            <GoogleIcon size={20} />
            <div className="testimonials__badge-text">
              {googleRating ? (
                <>
                  <div className="testimonials__badge-stars" aria-hidden="true">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span>
                    {Number(googleRating).toFixed(1)}
                    {totalReviews ? ` · ${totalReviews} ${t('Google Reviews')}` : ` · ${t('Google Reviews')}`}
                  </span>
                </>
              ) : (
                <span>{t('Read our reviews on Google')}</span>
              )}
            </div>
          </a>
        </header>

        {hasReviews && (
        <div
          className="testimonials__carousel reveal"
          role="region"
          aria-roledescription="carousel"
          aria-label="Patient reviews"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button type="button" className="testimonials__arrow testimonials__arrow--prev" onClick={prev} aria-label="Previous review">
            <ChevronLeft size={20} />
          </button>

          <div className="testimonials__viewport">
            <div
              className="testimonials__track"
              ref={trackRef}
            >
              {reviews.map((r, i) => {
                const name     = r.author || r.name;
                const subline  = r.time   || r.treatment;
                const initials = r.initials || name?.slice(0, 2).toUpperCase();

                return (
                  <article
                    key={name + i}
                    className={`review-card${i === active ? ' is-active' : ''}`}
                    aria-label={`Review by ${name}`}
                    aria-hidden={i !== active}
                  >
                    {/* Quote mark */}
                    <div className="review-card__quote" aria-hidden="true">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" opacity="0.12">
                        <path d="M14.017 21v-7.391c0-5.704 3.748-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h3.983v10h-9.966z"/>
                      </svg>
                    </div>

                    <StarRating count={r.rating} />

                    <p className="review-card__text">
                      {`"${r.text}"`}
                    </p>

                    <footer className="review-card__footer">
                      {/* Initials only — Google profile photos are not loaded (privacy) */}
                      <div
                        className="review-card__avatar"
                        aria-hidden="true"
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="review-card__name">{name}</div>
                        <div className="review-card__treatment">{subline}</div>
                      </div>
                      <div className="review-card__verified" aria-label="Google review">
                        <GoogleIcon size={14} />
                        <span>Google</span>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>

          <button type="button" className="testimonials__arrow testimonials__arrow--next" onClick={next} aria-label="Next review">
            <ChevronRight size={20} />
          </button>
        </div>
        )}

        {hasReviews && (
        <div className="testimonials__dots" role="tablist" aria-label="Choose review">
          {reviews.map((r, i) => (
            <button
              key={(r.author || r.name) + i}
              type="button"
              role="tab"
              className={`testimonials__dot${i === active ? ' active' : ''}`}
              aria-selected={i === active}
              aria-label={`Show review ${i + 1} of ${reviews.length}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
