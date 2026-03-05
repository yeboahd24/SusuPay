import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('language.title')}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              i18n.language === lang.code
                ? 'bg-primary-100 text-primary-700 border-2 border-primary-400'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}
