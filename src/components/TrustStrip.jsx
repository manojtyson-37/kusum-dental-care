import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext';

const stats = [
  { num: '15+', label: 'Years of Excellence' },
  { num: '5000+', label: 'Happy Patients' },
  { num: '7', label: 'Dental Specialties' },
  { num: '7', label: 'Days a Week' },
];

function CountUpStat({ num, label, active }) {
  const target = parseInt(num.replace(/\D/g, ''), 10) || 0;
  const suffix = num.replace(/[0-9]/g, '');
  const [value, setValue] = useState(0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!active) return undefined;
    if (reduceMotion) { setValue(target); return undefined; }

    let raf;
    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // custom ease-out-cubic
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, reduceMotion]);

  return (
    <div className="trust-stat">
      <div className="trust-stat__num">{value}{suffix}</div>
      <div className="trust-stat__label">{label}</div>
    </div>
  );
}

export default function TrustStrip() {
  const { t } = useLang();
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) setActive(true); }),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="trust-strip" ref={sectionRef} aria-label="Clinic statistics">
      <div className="container">
        <div className="trust-strip__inner">
          {stats.map((s) => (
            <CountUpStat key={s.label} num={s.num} label={t(s.label)} active={active} />
          ))}
        </div>
      </div>
    </section>
  );
}
