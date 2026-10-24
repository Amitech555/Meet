import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import fr from './fr.json';
import en from './en.json';
import type { AppLocale } from '@/lib/time';

export const resources = { fr: { translation: fr }, en: { translation: en } } as const;

function detectLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'fr'; // Français par défaut (Québec)
}

const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: detectLocale(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function currentLocale(): AppLocale {
  return i18n.language === 'en' ? 'en' : 'fr';
}

export default i18n;
