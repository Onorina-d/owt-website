import uk from './uk';
import en from './en';

export type Locale = 'uk' | 'en';
export const locales: Locale[] = ['uk', 'en'];

const dicts = { uk, en };

export function getDict(locale: Locale) {
  return dicts[locale];
}

/** Home URL for a locale (uk is unprefixed). */
export function homePath(locale: Locale) {
  return locale === 'uk' ? '/' : `/${locale}/`;
}
