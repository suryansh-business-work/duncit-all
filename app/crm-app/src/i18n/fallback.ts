import {
  CRM_APP_BUNDLE,
  CRM_BUNDLE,
  MWEB_BUNDLE,
  SHELL_BUNDLE,
  UI_BUNDLE,
  createTranslator,
  flattenCatalogue,
  type NestedCatalogue,
  type Translator,
} from '@duncit/i18n';

/**
 * The app's LOCAL FALLBACK copy (rule 24: server first, this only when the
 * server has no translation): the app's own `crmApp.*`, the portal's `crm.*`
 * and `shell.*` (Security Verification, common words — the same sentences the
 * CRM portal shows), `ui.*` for the error boundary, and only the `mweb.auth`
 * validation messages the shared login schema (@duncit/forms/schemas) uses.
 */
const mweb = MWEB_BUNDLE.mweb as NestedCatalogue;

export const CRM_FALLBACK: NestedCatalogue = {
  ...CRM_APP_BUNDLE,
  ...CRM_BUNDLE,
  ...SHELL_BUNDLE,
  ...UI_BUNDLE,
  mweb: { auth: mweb.auth as NestedCatalogue, signup: mweb.signup as NestedCatalogue },
};

export const CRM_FALLBACK_FLAT = flattenCatalogue(CRM_FALLBACK);

export type Translate = Translator['t'];

/** The bundled English, for code that runs outside React (schemas, the background sync). */
export const fallbackT: Translate = createTranslator({ locale: 'en-IN', fallback: CRM_FALLBACK_FLAT }).t;
