import {
  LANGUAGE_PICKER_QUERY,
  MY_LOCALE_QUERY,
  SET_MY_LOCALE_MUTATION,
  TRANSLATIONS_QUERY,
} from '../support/operations';
import { runAccount, type RunAccount } from '../support/run-account';

/**
 * The shared console profile page (@duncit/shell ProfilePage) at `/profile`,
 * signed in as the mWeb account (password CHANGED).
 *
 * The language is put back in `after()`, whatever happened, because the mWeb
 * delete spec runs next against the same account and reads English copy.
 */

const NEW_FIRST_NAME = 'Asha';
const NEW_LAST_NAME = 'Partner';
const FIRST_NAME_WITH_DIGITS = 'Riya2';
/** The role every account holds; its chip is `profile-role-<role>` and reads `User`. */
const USER_ROLE = 'USER';

/** @duncit/app-settings LANGUAGE_PREFERENCE_FLAG — the picker's switch. */
const LANGUAGE_FLAG = 'language_preference';
/** The key the picker's confirmation renders, and what packages/i18n ships for it. */
const LANGUAGE_SAVED_KEY = 'mweb.common.languageSaved';
const LANGUAGE_SAVED_SHIPPED = 'Language updated';

interface PickerData {
  publicFeatureFlags: { key: string; enabled: boolean }[];
  publicLocales: { code: string }[];
}

interface CatalogueData {
  publicTranslations: { key: string; value: string }[];
}

interface LanguageSwitch {
  original: string;
  target: string;
  /** The confirmation as it reads in the target language. */
  savedCopy: string;
}

/** The confirmation's copy in a catalogue — the shipped English when the catalogue has no row. */
const savedCopyIn = (data: CatalogueData): string =>
  data.publicTranslations.find((row) => row.key === LANGUAGE_SAVED_KEY)?.value ?? LANGUAGE_SAVED_SHIPPED;

/** A language the account is not using, and how the save confirmation reads in it. */
function pickOtherLanguage(locales: readonly string[]): Cypress.Chainable<LanguageSwitch> {
  return cy.gql<{ me: { locale: string } }>(MY_LOCALE_QUERY).then(({ me }) => {
    const target = locales.find((code) => code !== me.locale) ?? '';
    expect(target, 'an active language other than the saved one').not.to.equal('');
    return cy
      .gql<CatalogueData>(TRANSLATIONS_QUERY, { locale: target }, { token: null })
      .then((data) => ({ original: me.locale, target, savedCopy: savedCopyIn(data) }));
  });
}

/** `Edit`, then type the names given. */
function editNames(firstName: string, lastName?: string): void {
  cy.visitApp('/profile');
  cy.byTestId('account-edit').should('contain.text', 'Edit').click();
  cy.byTestId('field-first_name').clear().type(firstName);
  if (lastName !== undefined) {
    cy.byTestId('field-last_name').clear().type(lastName);
  }
}

/** `Save changes` and wait for the server's answer. */
function saveNames(): void {
  cy.interceptOperation('ShellUpdateMyProfile');
  cy.byTestId('account-edit-submit').should('contain.text', 'Save changes').click();
  cy.wait('@ShellUpdateMyProfile');
}

describe('Partners · profile (mWeb account, password CHANGED)', () => {
  let account: RunAccount;
  /** Active locales when the picker renders (flag on, 2+ locales); empty otherwise. */
  let pickerLocales: string[] = [];
  /** The language to put back; set just before the spec changes it. */
  let restoreLocale = '';

  before(() => {
    account = runAccount();
    cy.gql<PickerData>(LANGUAGE_PICKER_QUERY, {}, { token: null }).then((data) => {
      const enabled = data.publicFeatureFlags.some((flag) => flag.key === LANGUAGE_FLAG && flag.enabled);
      pickerLocales = enabled ? data.publicLocales.map((locale) => locale.code) : [];
    });
  });

  beforeEach(() => {
    cy.apiLogin(account.email, account.password('CHANGED'));
  });

  after(() => {
    if (restoreLocale) {
      cy.gql(SET_MY_LOCALE_MUTATION, { locale: restoreLocale });
    }
  });

  it('PU-P1 Edit › first and last name › Save changes shows Profile updated. and the role chip User', () => {
    editNames(NEW_FIRST_NAME, NEW_LAST_NAME);
    saveNames();
    cy.byTestId('profile-saved').should('be.visible').and('contain.text', 'Profile updated.');
    cy.byTestId(`profile-role-${USER_ROLE}`).should('be.visible').and('have.text', 'User');
  });

  it('PU-P2 a first name with digits shows Validation failed', () => {
    editNames(FIRST_NAME_WITH_DIGITS);
    saveNames();
    cy.byTestId('account-edit-error').should('be.visible').and('contain.text', 'Validation failed');
  });

  it('PU-17(P) the language picker, when rendered, shows Language updated', function () {
    if (pickerLocales.length < 2) {
      // Not rendered: the language_preference flag is off, or fewer than two locales are active.
      this.skip();
    }
    pickOtherLanguage(pickerLocales).then((change) => {
      restoreLocale = change.original;
      cy.visitApp('/profile');
      cy.interceptOperation('SetMyLocale');
      cy.byTestId('language-select').click();
      cy.byTestId(`locale-option-${change.target}`).click();
      cy.wait('@SetMyLocale').its('response.body.data.setMyLocale.locale').should('eq', change.target);
      cy.byTestId('language-saved').should('be.visible').and('contain.text', change.savedCopy);
    });
  });
});
