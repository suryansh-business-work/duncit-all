export { PUBLIC_APP_SETTINGS, useDateFormat } from './useDateFormat';
export type { DateInput, UseDateFormatOptions } from './useDateFormat';
export { PUBLIC_FEATURE_FLAGS, useFeatureFlag } from './useFeatureFlag';
// Re-exported so every portal gets the shared clock/formatter from one place.
export {
  DEFAULT_TIME_SOURCE,
  TIME_SOURCES,
  createClock,
  createDateFormatter,
  resetServerTimeStamp,
  stampServerTime,
  resolveActiveOccasion,
  resolveNow,
  toEpochMs,
  toTimeSource,
  type Clock,
  type ClockInput,
  type DateFormatter,
  type OccasionWindow,
  type TimeSource,
} from '@duncit/datetime';
export {
  LocaleProvider,
  PUBLIC_LOCALES,
  PUBLIC_TRANSLATIONS,
  useTranslation,
} from './useTranslation';
export {
  createTranslator,
  flattenCatalogue,
  mergeCatalogues,
  missingKeys,
  nestCatalogue,
  resolveLocale,
  type FlatCatalogue,
  type Locale,
  type NestedCatalogue,
  type Translator,
} from '@duncit/i18n';
