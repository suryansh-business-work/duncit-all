/**
 * Localization for a React surface — the provider, the hook every component
 * calls, and the package-scoped variant. One import path, as before the split.
 */
export { PUBLIC_LOCALES, PUBLIC_TRANSLATIONS } from './queries';
export { LocaleProvider } from './LocaleProvider';
export { createBundleTranslation, useTranslation } from './hooks';
