/**
 * The API operations the suite sends itself, through `cy.gql` — never through
 * the app, so none of them shares a name with an operation a spec waits on.
 */

/** The password login every console posts; `portal_key` names the console. */
export const LOGIN_MUTATION = `mutation E2ePortalLogin($input: LoginInput!) {
  login(input: $input) { token }
}`;

/** Whether the profile page renders its language picker: the flag, and 2+ active locales. */
export const LANGUAGE_PICKER_QUERY = `query E2eLanguagePicker {
  publicFeatureFlags { key enabled }
  publicLocales { code }
}`;

/** One locale's catalogue, already merged over the default locale. */
export const TRANSLATIONS_QUERY = `query E2eTranslations($locale: String!) {
  publicTranslations(locale: $locale) { key value }
}`;

/** The language saved on the signed-in account. */
export const MY_LOCALE_QUERY = `query E2eMyLocale {
  me { locale }
}`;

/** Put the account's language back. */
export const SET_MY_LOCALE_MUTATION = `mutation E2eRestoreLocale($locale: String!) {
  setMyLocale(locale: $locale) { user_id locale }
}`;
