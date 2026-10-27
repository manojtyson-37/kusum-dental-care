import { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';

const WA_URL = "https://wa.me/918431907976?text=Hi%20Dr.%20Kusum's%20Dental%20Care%2C%20I%20would%20like%20to%20schedule%20an%20appointment.";

const WhatsAppIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.878L0 24l6.31-1.508A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.034-1.381l-.36-.214-3.718.889.923-3.619-.233-.368A9.818 9.818 0 1112 21.818z"/>
  </svg>
);

export default function WhatsAppButton() {
  const { t } = useLang();
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);

  /* Auto-show bubble 3s after load, hide at 11s */
  useEffect(() => {
    if (bubbleDismissed) return;
    const show = setTimeout(() => setBubbleVisible(true), 3000);
    const hide = setTimeout(() => setBubbleVisible(false), 11000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [bubbleDismissed]);

  const handleDismissBubble = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBubbleVisible(false);
    setBubbleDismissed(true);
  };

  return (
    <div className="whatsapp-float" aria-label="Book appointment via WhatsApp">

      {/* Tooltip bubble — clicking opens WhatsApp directly */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`whatsapp-float__bubble${bubbleVisible ? ' whatsapp-float__bubble--visible' : ''}`}
        onClick={() => setBubbleVisible(false)}
        aria-label="Book Appointment on WhatsApp"
      >
        <span>{t("Book Appointment")}</span>
        <button
          className="whatsapp-float__close"
          onClick={handleDismissBubble}
          aria-label="Dismiss"
          type="button"
        >×</button>
      </a>

      {/* FAB — directly opens WhatsApp */}
      <div style={{ position: 'relative' }}>
        <div className="whatsapp-pulse" aria-hidden="true" />
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-float__btn"
          aria-label="Book appointment via WhatsApp"
          id="whatsapp-float-btn"
          onMouseEnter={() => !bubbleDismissed && setBubbleVisible(true)}
          onMouseLeave={() => setBubbleVisible(false)}
        >
          <WhatsAppIcon />
        </a>
      </div>
    </div>
  );
}
