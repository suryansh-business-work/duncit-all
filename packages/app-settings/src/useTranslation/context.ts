import { createContext } from 'react';
import type { Locale, Translator } from '@duncit/i18n';

export interface LocaleContextValue {
  t: Translator['t'];
  has: Translator['has'];
  locale: string;
  isRtl: boolean;
  locales: Locale[];
  setLocale: (code: string) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);
