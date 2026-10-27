import { useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const services = [
  {
    title: 'Root Canal Treatment',
    desc: 'Root canal treatment using rotary systems, aimed at saving your natural tooth with minimal discomfort.',
    icon: <img src="/services/root-canal.png" alt="" width="34" height="34" className="service-row__icon-img" />,
  },
  {
    title: 'Dental Implants',
    desc: 'Permanent, natural-looking tooth replacements with titanium implants for a confident smile.',
    icon: <img src="/services/dental-implant.png" alt="" width="34" height="34" className="service-row__icon-img" />,
  },
  {
    title: 'Cosmetic Dentistry',
    desc: 'Teeth whitening, veneers, and smile makeovers to give you the radiant smile you deserve.',
    icon: <img src="/services/cosmetic-dentistry.png" alt="" width="34" height="34" className="service-row__icon-img" />,
  },
  {
    title: 'Dental Bridges',
    desc: 'Customized fixed bridges to restore missing teeth and maintain your bite alignment.',
    icon: <img src="/services/dental-bridges.png" alt="" width="84" className="service-row__icon-img" />,
  },
  {
    title: 'Braces & Aligners',
    desc: 'Traditional braces and clear aligners for perfectly aligned teeth and a beautiful smile.',
    icon: <img src="/services/braces-aligners.png" alt="" width="68" className="service-row__icon-img" />,
  },
  {
    title: 'Gum Surgery',
    desc: 'Advanced periodontal treatments to treat gum disease and restore healthy gum tissue.',
    icon: <img src="/services/gum-surgery.png" alt="" width="60" height="60" className="service-row__icon-img" />,
  },
  {
    title: 'Dentures',
    desc: 'Full and partial dentures crafted for comfort and a natural appearance, restoring your smile.',
    icon: <img src="/services/dentures.png" alt="" width="36" height="36" className="service-row__icon-img" />,
  },
];

export default function Services() {
  const { t } = useLang();
  const cardsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    cardsRef.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Scroll-spy: highlight strictly only one row closest to viewport center while scrolling
  useEffect(() => {
    let raf = null;
    function updateActive() {
      raf = null;
      const viewportCenter = window.innerHeight / 2;
      let closest = null;
      let closestDist = Infinity;
      cardsRef.current.forEach((el) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        if (dist < closestDist) { closestDist = dist; closest = el; }
      });
      cardsRef.current.forEach((el) => el && el.classList.toggle('active', el === closest));
    }

    function onScroll() {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);

      if (raf == null) raf = requestAnimationFrame(updateActive);
    }

    updateActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf != null) cancelAnimationFrame(raf);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const setActiveRow = (idx) => {
    if (isScrollingRef.current) return;
    cardsRef.current.forEach((el, i) => {
      if (el) el.classList.toggle('active', i === idx);
    });
  };

  // 3D Tilt & Dynamic Specular Sheen on Desktop
  const handleMouseMove = (e, idx) => {
    setActiveRow(idx);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = cardsRef.current[idx];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotX = ((y - centerY) / centerY) * -5.0;
    const rotY = ((x - centerX) / centerX) * 6.5;

    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px) scale(1.01)`;
  };

  const handleMouseLeave = (idx) => {
    const card = cardsRef.current[idx];
    if (!card) return;
    card.style.transform = '';
  };

  const handleListMouseLeave = () => {
    const viewportCenter = window.innerHeight / 2;
    let closest = null;
    let closestDist = Infinity;
    cardsRef.current.forEach((el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (dist < closestDist) { closestDist = dist; closest = el; }
    });
    cardsRef.current.forEach((el) => el && el.classList.toggle('active', el === closest));
  };

  return (
    <section className="services section-pad" id="services" aria-labelledby="services-title">
      <div className="container">
        <header className="services__header">
          <h2 className="section-title" id="services-title">
            {t("Comprehensive Dental Services")}
          </h2>
          <p className="section-subtitle">
            {t("From preventive restorations to advanced dental implantology, our multi-specialty team delivers high clinical standards in Bangalore with gentle precision.")}
          </p>
        </header>

        <div className="services__list" role="list" onMouseLeave={handleListMouseLeave}>
          {services.map((s, i) => (
            <article
              key={s.title}
              className={`service-row tilt-3d ${i % 2 === 0 ? 'reveal-slide-left' : 'reveal-slide-right'}`}
              ref={el => (cardsRef.current[i] = el)}
              onMouseEnter={() => setActiveRow(i)}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
              style={{ transitionDelay: `${(i % 4) * 0.08}s` }}
              role="listitem"
            >
              <span className="service-row__index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="service-row__icon" aria-hidden="true">{s.icon}</div>
              <div className="service-row__body">
                <div className="service-row__heading">
                  <h3 className="service-row__title">{t(s.title)}</h3>
                </div>
                <p className="service-row__desc">{t(s.desc)}</p>
              </div>

              {/* Direct consultation link */}
              <a
                href={`https://wa.me/918431907976?text=${encodeURIComponent(`Hi Dr. Kusum's Dental Care, I would like to consult regarding ${s.title}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="service-row__action"
                aria-label={`Inquire about ${s.title} on WhatsApp`}
              >
                <span>{t("Inquire")}</span>
                <ArrowUpRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
