import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { CLINIC, LAST_UPDATED } from './legalContent';
import BusinessDetails from './BusinessDetails';

const wa = (text) => `https://wa.me/918431907976?text=${encodeURIComponent(text)}`;

const REQUESTS = [
  {
    title: 'Delete my data',
    desc: 'Ask us to erase the personal data we hold about you.',
    msg: "Hello Dr. Kusum's Dental Care, I would like to request deletion of my personal data. Name: ____  Phone number used at the clinic: ____",
  },
  {
    title: 'Get a copy of my data',
    desc: 'Ask what we hold about you and receive a copy.',
    msg: "Hello Dr. Kusum's Dental Care, I would like a copy of the personal data you hold about me. Name: ____  Phone number used at the clinic: ____",
  },
  {
    title: 'Correct my data',
    desc: 'Ask us to fix details that are wrong or out of date.',
    msg: "Hello Dr. Kusum's Dental Care, I would like to correct my personal data. Name: ____  Phone number used at the clinic: ____  What to correct: ____",
  },
];

export default function DataRequest() {
  const { t, lang } = useLang();

  useEffect(() => {
    window.scrollTo(0, 0);
    const prev = document.title;
    document.title = `Data Request | ${CLINIC.name}`;
    return () => { document.title = prev; };
  }, []);

  return (
    <main id="main" tabIndex={-1} className="legal">
      <div className="container legal__inner">
        <Link to="/" className="legal__back">{t('← Back to home')}</Link>
        {lang === 'kn' && <p className="legal__notice" lang="kn">{t('This page is currently available in English only.')}</p>}
        <h1 className="legal__title">Data Request</h1>
        <p className="legal__updated">Last updated: {LAST_UPDATED}</p>
        <p className="legal__intro">
          You can ask us to delete, correct or give you a copy of the personal data we hold about you. Choose an option
          below. It opens a ready-made WhatsApp message to the clinic. You can also call {CLINIC.phone1} or ask at the clinic.
        </p>

        <div className="legal__requests">
          {REQUESTS.map((r) => (
            <a key={r.title} className="legal__request" href={wa(r.msg)} target="_blank" rel="noopener noreferrer">
              <strong>{r.title}</strong>
              <span>{r.desc}</span>
            </a>
          ))}
        </div>

        <section className="legal__section">
          <h2>What happens next</h2>
          <p>We will confirm it is really you (for example by calling back the number on your record or checking ID at the clinic), so that nobody else can obtain or delete your records.</p>
          <p>We aim to complete your request within 30 days and will tell you the outcome.</p>
        </section>
        <section className="legal__section">
          <h2>What we may have to keep</h2>
          <p>Medical and billing records may have to be kept for a period required by law. Where we cannot delete something, we will tell you why and limit its use to that legal purpose.</p>
        </section>
        <section className="legal__section">
          <h2>Only what we need</h2>
          <p>Please do not send medical documents or ID over WhatsApp. Share only your name and the phone number on your record. We will ask for anything else in person.</p>
        </section>
        <BusinessDetails />
      </div>
    </main>
  );
}
