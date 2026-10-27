import { useLang } from '../i18n/LangContext';

export default function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button type="button" className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'} lang="en">
        EN
      </button>
      <button type="button" className={lang === 'kn' ? 'is-active' : ''} onClick={() => setLang('kn')} aria-pressed={lang === 'kn'} lang="kn">
        ಕನ್ನಡ
      </button>
    </div>
  );
}
