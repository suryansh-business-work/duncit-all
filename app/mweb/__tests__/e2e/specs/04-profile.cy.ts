/// <reference types="cypress" />
import { dobMinAgeMessage } from '@duncit/datetime';
import { DIALOG, dialogWith, sendCode, wrongCode } from '../support/account-steps';
import { expectDob, minSignupAge, typeDob, underAgeDob, type Dob } from '../support/dob';
import {
  confirmEmailCode,
  contactDialog,
  formBox,
  openAccount,
  openContactChange,
  openEditProfile,
  pickOption,
  requestEmailChange,
  saveButton,
  savePhoneNumber,
  saveProfile,
  tapOutsideEditDialog,
} from '../support/profile-steps';
import { runAccount } from '../support/run-account';

/**
 * 04 — Profile, live (stage RECOVERED). Signed in once through the API; every
 * scenario opens /account (or /profile) fresh.
 */

/** `PROFILE_BIO_MAX_LENGTH` in @duncit/forms. */
const BIO_LIMIT = 500;
const LATER_DOB: Dob = { Day: '15', Month: '8', Year: '1994' };
const MAIN_ADDRESS = {
  line1: '12 Residency Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560025',
  country: 'India',
} as const;

const LANGUAGE_GATE_QUERY = `query E2eLanguageGate {
  publicFeatureFlags { key enabled }
  publicLocales { code }
}`;
const MY_LOCALE_QUERY = `query E2eMyLocale {
  me { locale }
}`;

type LanguageGate = {
  publicFeatureFlags: Array<{ key: string; enabled: boolean }>;
  publicLocales: Array<{ code: string }>;
};

const PRIVATE_SWITCH = 'input[aria-label="Toggle private account"]';
/** The phone row's Change button; its parent is the row with the number in it. */
const PHONE_ROW_BUTTON = '[data-testid="contact-change-PHONE"]';
const htmlLang = () => cy.document().its('documentElement.lang');

/** Pick a language in the Preferences card and wait for the server to store it. */
function pickLanguage(code: string): void {
  cy.get('[data-testid="TranslateIcon"]').closest('.MuiInputBase-root').find('[role="combobox"]').click();
  sendCode('SetMyLocale', () => {
    cy.get(`[role="option"][data-value="${code}"]`).click();
  });
}

function toggleVisibility(): void {
  sendCode('SetMyProfileVisibility', () => {
    cy.get(PRIVATE_SWITCH).click();
  });
}

describe('04 Profile', () => {
  const account = runAccount();
  const handle = `e2e-${account.stamp}`.toLowerCase();

  before(() => {
    cy.apiLogin(account.email, account.password('RECOVERED'));
  });

  it('PU-01 Edit opens Edit profile, and Save waits for a change', () => {
    openEditProfile();
    cy.contains(DIALOG, 'Edit profile').should('be.visible');
    saveButton().should('be.disabled');
    formBox('bio').type(' and more');
    saveButton().should('be.enabled');
  });

  it('PU-02 the first name is required and may not hold digits', () => {
    openEditProfile();
    formBox('first_name').clear();
    cy.contains(DIALOG, 'First name is required').should('be.visible');
    saveButton().should('be.disabled');
    formBox('first_name').type('Riya2');
    cy.contains(DIALOG, 'First name can use letters, spaces, apostrophes and periods only').should('be.visible');
    saveButton().should('be.disabled');
  });

  it('PU-03 first name, last name and bio save and survive a reload; a cleared last name saves too', () => {
    const bio = `Board games and long walks, run ${account.stamp}`;
    openEditProfile();
    formBox('first_name').clear().type('Riya');
    formBox('last_name').clear().type('Duncit');
    formBox('bio').clear().type(bio);
    saveProfile();
    openAccount();
    cy.contains('h1', 'Riya Duncit').should('be.visible');
    cy.contains(bio).should('be.visible');
    cy.contains('button', /^Edit$/).click();
    formBox('last_name').clear();
    saveProfile();
    openEditProfile();
    formBox('last_name').should('have.value', '');
    formBox('first_name').should('have.value', 'Riya');
  });

  it('PU-04 a bio over the limit is refused', () => {
    openEditProfile();
    formBox('bio').clear().type('a'.repeat(BIO_LIMIT + 1), { delay: 0 });
    cy.contains(DIALOG, `Bio must be ${BIO_LIMIT} characters or fewer`).should('be.visible');
    saveButton().should('be.disabled');
  });

  it('PU-05 closing with changes asks first; Keep editing keeps them and Discard drops them', () => {
    const unsaved = `Unsaved note ${account.stamp}`;
    openEditProfile();
    formBox('bio').invoke('val').then((saved) => {
      formBox('bio').clear().type(unsaved);
      tapOutsideEditDialog();
      cy.contains(DIALOG, 'Discard unsaved changes?').should('be.visible');
      cy.get('[data-testid="discard-cancel"]').should('contain.text', 'Keep editing').click();
      formBox('bio').should('have.value', unsaved);
      tapOutsideEditDialog();
      cy.get('[data-testid="discard-confirm-yes"]').should('contain.text', 'Discard').click();
      cy.contains(DIALOG, 'Edit profile').should('not.exist');
      cy.contains('button', /^Edit$/).click();
      formBox('bio').should('have.value', String(saved));
    });
  });

  it('PU-06 the username is checked as it is typed, and a free one saves', () => {
    openEditProfile();
    cy.fieldByLabel('Username').clear().type('Ab');
    cy.contains(DIALOG, 'Use 3–30 lowercase letters, numbers and single hyphens.').should('be.visible');
    cy.fieldByLabel('Username').clear().type('admin');
    cy.contains(DIALOG, 'That username is reserved.').should('be.visible');
    cy.fieldByLabel('Username').clear().type(handle);
    cy.contains(DIALOG, `@${handle} is available.`).should('be.visible');
    cy.get('[data-testid="username-link-preview"]').should('contain.text', `/u/${handle}`);
    cy.interceptOperation('SetMyUsername');
    saveProfile();
    cy.wait('@SetMyUsername');
    openEditProfile();
    cy.contains(DIALOG, 'This is your username.').should('be.visible');
  });

  it('PU-07 a date of birth under the minimum age is refused, and a valid one saves', () => {
    minSignupAge().then((minAge) => {
      openEditProfile();
      typeDob(underAgeDob(minAge));
      cy.contains(DIALOG, dobMinAgeMessage(minAge)).should('be.visible');
      saveButton().should('be.disabled');
    });
    typeDob(LATER_DOB);
    saveProfile();
    openEditProfile();
    expectDob(LATER_DOB);
  });

  it('PU-08 picking a country clears state and city; country, state and city save', () => {
    openEditProfile();
    pickOption('Country', 'India');
    pickOption('State', 'Karnataka');
    cy.fieldByLabel('City').clear().type('Bengaluru');
    pickOption('Country', 'Nepal');
    cy.fieldByLabel('State').should('have.value', '');
    cy.fieldByLabel('City').should('have.value', '');
    pickOption('Country', 'India');
    pickOption('State', 'Karnataka');
    cy.fieldByLabel('City').type('Bengaluru');
    saveProfile();
    cy.contains('Bengaluru · Karnataka · India').should('be.visible');
  });

  it('PU-09 a bad pincode is refused, and a full main address saves', () => {
    openEditProfile();
    formBox('address_pincode').clear().type('01234');
    cy.contains(DIALOG, 'Enter a valid 6-digit pincode').should('be.visible');
    saveButton().should('be.disabled');
    formBox('address_line1').clear().type(MAIN_ADDRESS.line1);
    formBox('address_city').clear().type(MAIN_ADDRESS.city);
    formBox('address_state').clear().type(MAIN_ADDRESS.state);
    formBox('address_pincode').clear().type(MAIN_ADDRESS.pincode);
    formBox('address_country').clear().type(MAIN_ADDRESS.country);
    saveProfile();
    openEditProfile();
    formBox('address_line1').should('have.value', MAIN_ADDRESS.line1);
    formBox('address_pincode').should('have.value', MAIN_ADDRESS.pincode);
  });

  it('PU-10 changing the email to the current address is refused', () => {
    openEditProfile();
    openContactChange('EMAIL');
    contactDialog('EMAIL').find('input[name="email"]').should('have.value', account.email);
    contactDialog('EMAIL').contains('button', 'Send code').click();
    cy.contains(DIALOG, 'That is what your account already has.').should('be.visible');
  });

  it('PU-11 the email moves to a new address behind its code, then back to the run email', () => {
    const newAddress = account.address('new');
    openEditProfile();
    requestEmailChange(newAddress).then((code) => {
      cy.contains(DIALOG, `We sent a code to ${newAddress}.`).should('be.visible');
      confirmEmailCode(wrongCode(code));
      cy.contains(DIALOG, 'Invalid OTP').should('be.visible');
      confirmEmailCode(code);
    });
    contactDialog('EMAIL').should('not.exist');
    cy.contains(DIALOG, newAddress).should('be.visible');
    requestEmailChange(account.email).then(confirmEmailCode);
    contactDialog('EMAIL').should('not.exist');
    cy.contains(DIALOG, account.email).should('be.visible');
  });

  it('PU-12 changing the WhatsApp number to the current number is refused', () => {
    openEditProfile();
    openContactChange('WHATSAPP');
    contactDialog('WHATSAPP').find('input[name="number"]').should('have.value', account.phone);
    contactDialog('WHATSAPP').contains('button', 'Send code').click();
    cy.contains(DIALOG, 'That is what your account already has.').should('be.visible');
  });

  it('PU-13 the phone number saves with Save number and no code, and is put back', () => {
    // The same number is refused as unchanged, so it moves to a run-owned number and back.
    const otherNumber = `9${account.stamp.replaceAll(/\D/g, '').slice(-9).padStart(9, '0')}`;
    openEditProfile();
    savePhoneNumber(otherNumber);
    cy.get(PHONE_ROW_BUTTON).parent().should('contain.text', `+91 ${otherNumber}`);
    savePhoneNumber(account.phone);
    cy.get(PHONE_ROW_BUTTON).parent().should('contain.text', `+91 ${account.phone}`);
  });

  it('PU-14 a JPG uploads through Adjust photo and shows as the profile photo', () => {
    openAccount();
    cy.fixture('avatar.jpg', null).as('avatar');
    cy.get('[data-testid="avatar-file-input"]').selectFile('@avatar', { force: true });
    cy.interceptOperation('UploadAvatarImage');
    sendCode('UpdateProfilePhoto', () => {
      dialogWith('Adjust photo').contains('button', /^Save$/).should('be.enabled').click();
    });
    cy.wait('@UploadAvatarImage');
    cy.contains('Adjust photo').should('not.exist');
    cy.get('[data-testid="avatar-button"] img').should('have.attr', 'src').and('match', /^https:\/\//);
  });

  it('PU-15 Remove photo? › Remove clears the photo', () => {
    openAccount();
    cy.get('[data-testid="avatar-button"] img').should('exist');
    cy.get('[data-testid="avatar-edit"]').click();
    cy.get('[data-testid="photo-action-remove"]').click();
    sendCode('UpdateProfilePhoto', () => {
      dialogWith('Remove photo?').contains('button', /^Remove$/).click();
    });
    cy.get('[data-testid="avatar-button"] img').should('not.exist');
    openAccount();
    cy.get('[data-testid="avatar-button"] img').should('not.exist');
  });

  it('PU-16 a language change is stored and survives a reload (when the picker is offered)', () => {
    cy.gql<LanguageGate>(LANGUAGE_GATE_QUERY, {}, { token: null }).then((gate) => {
      const flagOn = gate.publicFeatureFlags.some((flag) => flag.key === 'language_preference' && flag.enabled);
      const codes = gate.publicLocales.map((locale) => locale.code);
      if (!flagOn || codes.length < 2) {
        cy.log('The language picker is not rendered here (flag off or one locale) — nothing to change.');
        return;
      }
      openAccount();
      htmlLang().then((original) => {
        const next = codes.find((code) => code !== original) ?? codes[0];
        pickLanguage(next);
        cy.get('.MuiSnackbar-root').should('be.visible');
        openAccount();
        htmlLang().should('eq', next);
        cy.gql(MY_LOCALE_QUERY).its('me.locale').should('eq', next);
        pickLanguage(String(original));
        cy.contains('Language updated').should('be.visible');
      });
    });
  });

  it('PU-17 Private account survives a reload, and is put back', () => {
    openAccount();
    cy.get(PRIVATE_SWITCH).then(($switch) => {
      const wasPrivate = $switch.is(':checked');
      toggleVisibility();
      openAccount();
      cy.get(PRIVATE_SWITCH).should(wasPrivate ? 'not.be.checked' : 'be.checked');
      toggleVisibility();
      cy.get(PRIVATE_SWITCH).should(wasPrivate ? 'be.checked' : 'not.be.checked');
    });
  });

  it('PU-18 /profile saves a description with one link, a blank link row notwithstanding', () => {
    const description = `Weekend hiker, run ${account.stamp}`;
    cy.visitApp('/profile');
    cy.contains('Description and links').parent().contains('button', 'Edit').click();
    cy.fieldByLabel('Profile description').clear().type(description);
    cy.get('input[name="profile_links.0.label"]').clear().type('Duncit');
    cy.get('input[name="profile_links.0.url"]').clear().type('https://duncit.com');
    cy.contains('button', 'Add link').click();
    cy.get('input[name="profile_links.1.label"]').should('have.value', '');
    sendCode('UpdateMyProfile', () => {
      cy.contains('button', 'Add link').closest('form').contains('button', /^Save$/).click();
    });
    cy.contains('Profile saved').should('be.visible');
    cy.contains(description).should('be.visible');
    cy.contains('a[href="https://duncit.com"]', 'Duncit').should('be.visible');
  });
});
