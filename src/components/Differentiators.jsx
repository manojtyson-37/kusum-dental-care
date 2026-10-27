import { useEffect, useRef, useState, useCallback } from 'react';
import { useLang } from '../i18n/LangContext';

// Real clinic photos only (no stock imagery), and no fabricated quotes
// attributed to Dr. Kusum by name — these are feature tiles, not testimonials.
const REAL_PHOTOS = ['/gallery/dental-1.webp', '/gallery/dental-3.jpg', '/gallery/dental-2.webp'];

const ALL_CARDS = [
  {
    id: 'c-1',
    image: REAL_PHOTOS[0],
    title: 'Sterilized & Safe Environment',
    desc: 'Strict sterilization protocols followed at every visit.',
    tag: 'Hygiene',
  },
  {
    id: 'c-2',
    image: REAL_PHOTOS[1],
    title: 'Expert Specialist Care',
    desc: 'Dedicated, qualified specialist expertise for every procedure.',
    tag: 'Specialist Care',
  },
  {
    id: 'c-3',
    image: REAL_PHOTOS[2],
    title: 'Patient-First Approach',
    desc: 'Personalized care plans tailored to your unique dental needs, comfort, and goals.',
    tag: 'Patient-First',
  },
  {
    id: 'c-4',
    image: REAL_PHOTOS[0],
    title: 'Clear, Upfront Pricing',
    desc: 'Dental care with clear pricing, explained before treatment begins.',
    tag: 'Transparent',
  },
  {
    id: 'c-5',
    image: REAL_PHOTOS[1],
    title: 'Modern Equipment',
    desc: 'Advanced digital technology and rotary systems for precision and comfort at every step.',
    tag: 'Advanced Tech',
  },
  {
    id: 'c-6',
    image: REAL_PHOTOS[2],
    title: 'Open 7 Days a Week',
    desc: 'Mon – Sun, 9:30 AM – 9:00 PM, including Sundays. Walk-ins and emergencies welcome.',
    tag: 'Open 7 Days',
  },
  {
    id: 'c-7',
    image: REAL_PHOTOS[1],
    title: 'Class-B Autoclave Sterilization',
    desc: 'Rigorous multi-stage sterilization with sealed sterile instrument pouches for each patient.',
    tag: 'Sterilization',
  },
  {
    id: 'c-8',
    image: REAL_PHOTOS[2],
    title: 'Single Dedicated Doctor',
    desc: 'No rotating junior dentists. You are always treated directly by Dr. Kusum.',
    tag: 'Direct Care',
  },
  {
    id: 'c-9',
    image: REAL_PHOTOS[0],
    title: 'Gentle, Comfort-First Care',
    desc: 'Treating the anxious person, not just the tooth, with modern numbing protocols.',
    tag: 'Gentle Touch',
  },
  {
    id: 'c-10',
    image: REAL_PHOTOS[1],
    title: 'Itemized Upfront Estimates',
    desc: 'Clear consultation explanations with honest treatment costs before any procedure begins.',
    tag: 'No Surprises',
  },
  {
    id: 'c-11',
    image: REAL_PHOTOS[2],
    title: 'Digital Apex Locators & Rotary',
    desc: 'High-precision computerized root canal instrumentation for a smoother, more precise procedure.',
    tag: 'Modern Operatory',
  },
  {
    id: 'c-12',
    image: REAL_PHOTOS[0],
    title: 'Trusted by 5,000+ Families',
    desc: 'Serving the Malleshpalya community with consistent care and empathy.',
    tag: 'Malleshpalya',
  },
];

// Duplicate items for a seamless 360-degree infinite circular cylinder
const MULTI_CARDS = [...ALL_CARDS, ...ALL_CARDS, ...ALL_CARDS];

export default function Differentiators() {
  const { t } = useLang();
  const stageRef = useRef(null);
  const cardRefs = useRef([]);

  // Cylindrical physics state
  const rotRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update cylindrical transforms directly on DOM nodes for 60/120fps performance
  const updateCylinder = useCallback(() => {
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth <= 768;
    const radius = isMobile ? 540 : isTablet ? 720 : 1150;
    const cardSpacing = isMobile ? 190 : isTablet ? 225 : 305;

    const totalCount = MULTI_CARDS.length;
    const anglePerItem = cardSpacing / radius;
    const totalSpanAngle = totalCount * anglePerItem;

    const currentRot = rotRef.current;

    // Update Cards in Single Row
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      let angle = ((i * anglePerItem - currentRot) % totalSpanAngle + totalSpanAngle) % totalSpanAngle;
      if (angle > totalSpanAngle / 2) angle -= totalSpanAngle;

      // Visibility clipping for performance & visual clarity
      if (Math.abs(angle) > 1.35) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'flex';

      const x = radius * Math.sin(angle);
      const z = radius * (Math.cos(angle) - 1);
      const rotY = -angle * (180 / Math.PI);
      const scale = Math.max(0.82, Math.min(1.05, 1 + z / 2000));
      const opacity = Math.max(0.25, Math.min(1, 1 + z / 850));

      el.style.transform = `translate3d(${x}px, 0px, ${z}px) rotateY(${rotY}deg) scale(${scale})`;
      el.style.opacity = opacity;
      el.style.zIndex = Math.round(1000 + z);
    });
  }, []);

  // Animation frame loop for momentum & continuous auto-drift
  useEffect(() => {
    let animId;

    const loop = () => {
      if (!isDraggingRef.current) {
        // Friction damping for momentum after drag
        velocityRef.current *= 0.93;
        if (Math.abs(velocityRef.current) < 0.00005) {
          velocityRef.current = 0;
        }
        rotRef.current += velocityRef.current;

        // Continuous smooth auto-drift when user is not actively dragging
        if (Math.abs(velocityRef.current) === 0) {
          rotRef.current += 0.00045;
        }
      }

      updateCylinder();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    const handleResize = () => updateCylinder();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateCylinder]);

  // Pointer drag event handlers
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    lastPointerXRef.current = e.clientX;
    velocityRef.current = 0;
    if (stageRef.current) {
      stageRef.current.style.cursor = 'grabbing';
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;

    const radius = window.innerWidth <= 480 ? 540 : window.innerWidth <= 768 ? 720 : 1150;
    const dAngle = -(deltaX / radius);
    rotRef.current += dAngle;
    velocityRef.current = dAngle;
    updateCylinder();
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    if (stageRef.current) {
      stageRef.current.style.cursor = 'grab';
    }
  };

  return (
    <section
      className="differentiators-cylindrical relative overflow-hidden"
      id="differentiators"
      aria-labelledby="differentiators-title"
    >
      {/* Immersive Dark Teal Radial Atmosphere */}
      <div className="diff-ambient-glow" aria-hidden="true" />

      <div className="container relative z-10">
        <header className="diff-cylinder__header text-center">
          <h2 className="diff-title" id="differentiators-title">
            {t("It's All in the Details")}
          </h2>
          <p className="diff-subtitle">
            {t("The small things add up to a better dental visit. Here's what patients notice most at Dr. Kusum's Dental Care.")}
          </p>
        </header>
      </div>

      {/* 3D Cylindrical Drag Stage */}
      <div
        className="diff-cylinder-stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Left and Right Subtle Atmospheric Edge Fade Vignette */}
        <div className="diff-stage-vignette diff-stage-vignette--left" aria-hidden="true" />
        <div className="diff-stage-vignette diff-stage-vignette--right" aria-hidden="true" />

        {/* Single Center Cylinder Row */}
        <div className="diff-cylinder-row">
          {MULTI_CARDS.map((item, idx) => (
            <article
              key={`${item.id}-${idx}`}
              ref={(el) => (cardRefs.current[idx] = el)}
              className="diff-cyl-card"
            >
              <div className="diff-cyl-card__media">
                <img
                  src={item.image}
                  alt={t(item.title)}
                  className="diff-cyl-card__img"
                  loading="lazy"
                  draggable={false}
                />
                <span className="diff-cyl-card__tag">{t(item.tag)}</span>
              </div>

              <div className="diff-cyl-card__text-wrap">
                <h3 className="diff-cyl-card__title">{t(item.title)}</h3>
                <p className="diff-cyl-card__desc">{t(item.desc)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
