import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import tw from './locales/tw.json';
import ga from './locales/ga.json';
import ee from './locales/ee.json';
import ha from './locales/ha.json';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'tw', name: 'Twi' },
  { code: 'ga', name: 'Ga' },
  { code: 'ee', name: 'Ewe' },
  { code: 'ha', name: 'Hausa' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tw: { translation: tw },
      ga: { translation: ga },
      ee: { translation: ee },
      ha: { translation: ha },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'susupay-lang',
    },
  });

export default i18n;
