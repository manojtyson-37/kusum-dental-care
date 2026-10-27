import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { LEGAL_PAGES, LAST_UPDATED, CLINIC } from './legalContent';
import BusinessDetails from './BusinessDetails';

export default function LegalPage({ page }) {
  const doc = LEGAL_PAGES[page];
  const { t, lang } = useLang();

  useEffect(() => {
    window.scrollTo(0, 0);
    const prev = document.title;
    document.title = `${doc.title} | ${CLINIC.name}`;
    return () => { document.title = prev; };
  }, [doc.title]);

  return (
    <main id="main" tabIndex={-1} className="legal">
      <div className="container legal__inner">
        <Link to="/" className="legal__back">{t('← Back to home')}</Link>
        {lang === 'kn' && <p className="legal__notice" lang="kn">{t('This page is currently available in English only.')}</p>}
        <h1 className="legal__title">{doc.title}</h1>
        <p className="legal__updated">Last updated: {LAST_UPDATED}</p>
        <p className="legal__intro">{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.h} className="legal__section">
            <h2>{s.h}</h2>
            {s.p.map((t) => <p key={t}>{t}</p>)}
          </section>
        ))}
        <BusinessDetails />
      </div>
    </main>
  );
}
