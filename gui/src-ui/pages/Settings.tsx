import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ThemeToggle';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-strong tracking-tight">{t('nav.settings')}</h1>
        <p className="text-xs text-mute font-mono mt-1">phase-2 preview</p>
      </header>

      <section className="flex flex-col gap-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-mute">{t('theme.label')}</span>
        <ThemeToggle />
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-mute">{t('language.label')}</span>
        <div className="inline-flex gap-0.5 bg-bg-elev border border-border p-0.5 rounded-md w-fit">
          {LANGS.map((lang) => {
            const active = i18n.resolvedLanguage === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => i18n.changeLanguage(lang.code)}
                className={
                  'px-3 py-1 text-[11px] font-mono uppercase tracking-wide rounded ' +
                  (active ? 'bg-accent text-white' : 'text-mute hover:text-text')
                }
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
