import { useEffect, useState } from 'react';
import { useLang } from '../i18n/LangContext';

const PHRASE = 'GENTLE CARE   ·   MALLESHPALYA, BANGALORE   ·   SMILES SINCE DAY ONE   ·   ';

export default function WordTrail() {
  const { t } = useLang();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="word-trail" aria-hidden="true">
      <svg
        className="word-trail__svg"
        viewBox="0 0 1600 220"
        preserveAspectRatio="xMidYMid slice"
      >
        <path id="word-trail-arc" d="M -200 170 Q 800 10 1800 170" fill="none" />
        <text className="word-trail__text">
          <textPath href="#word-trail-arc" startOffset="0%">
            {`${t(PHRASE)}   `.repeat(2)}
            {!reduceMotion && (
              <animate
                attributeName="startOffset"
                from="0%"
                to="-100%"
                dur="60s"
                repeatCount="indefinite"
              />
            )}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
