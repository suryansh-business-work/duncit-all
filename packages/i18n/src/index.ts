export {
  flattenCatalogue,
  mergeCatalogues,
  missingKeys,
  nestCatalogue,
  type FlatCatalogue,
  type Locale,
  type NestedCatalogue,
} from './catalogue';
export {
  ADMIN_BUNDLE,
  AI_MONITORING_BUNDLE,
  allFallbackEntries,
  FINANCE_BUNDLE,
  GRIEVANCE_BUNDLE,
  MAIL_PREFERENCE_BUNDLE,
  MEDIA_BUNDLE,
  MWEB_BUNDLE,
  PARTNERS_BUNDLE,
  POD_PRODUCT_BUNDLE,
  POLICY_ACCEPTANCE_BUNDLE,
  SHELL_BUNDLE,
  SURFACE_BUNDLES,
  WEBSITE_BUNDLE,
  WHATSAPP_BUNDLE,
} from './bundles';
export {
  mailCategoryCopy,
  type MailCategoryCopy,
  type MailCategoryTranslate,
} from './mail-preference';
export {
  policyAcceptanceMethodLabel,
  type PolicyMethodTranslate,
} from './policy-acceptance';
export {
  whatsappCategoryCopy,
  type WaCategoryCopy,
  type WaCategoryTranslate,
} from './whatsapp';
export {
  createTranslator,
  interpolate,
  resolveLocale,
  type TranslateOptions,
  type TranslateVars,
  type Translator,
  type TranslatorInput,
} from './translator';
