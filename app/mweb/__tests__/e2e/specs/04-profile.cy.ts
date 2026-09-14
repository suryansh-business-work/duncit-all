/// <reference types="cypress" />
import { dobMinAgeMessage } from '@duncit/datetime';
import { fill, sendCode, wrongCode } from '../support/account-steps';
import { expectDob, minSignupAge, typeDob, underAgeDob, type Dob } from '../support/dob';
import {
  confirmEmailCode,
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
const UNCHANGED = 'That is what your account already has.';
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

const editDialog = () => cy.byTestId('edit-account-dialog');
const privateSwitch = () => cy.byTestId('privacy-switch-input');
const avatarPhoto = () => cy.byTestId('avatar-story-button-photo');
const htmlLang = () => cy.document().its('documentElement.lang');
/** The link rows of /profile's editor, in page order (each row is keyed by a generated id). */
const linkBox = (part: 'label' | 'url', row: number) =>
  cy.byTestIdPrefix(`profile-about-edit-form-link-${part}-`, '-input').eq(row);

/** Pick a language in the Preferences card and wait for the server to store it. */
function pickLanguage(code: string): void {
  cy.byTestId('language-select').click();
  sendCode('SetMyLocale', () => {
    cy.byTestId(`locale-option-${code}`).click();
  });
}

function toggleVisibility(): void {
  sendCode('SetMyProfileVisibility', () => {
    privateSwitch().click();
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
    saveButton().should('be.disabled');
    cy.byTestId('field-bio').type(' and more');
    saveButton().should('be.enabled');
  });

  it('PU-02 the first name is required and may not hold digits', () => {
    openEditProfile();
    cy.byTestId('field-first_name').clear();
    cy.byTestId('first_name-error').should('have.text', 'First name is required');
    saveButton().should('be.disabled');
    cy.byTestId('field-first_name').type('Riya2');
    cy.byTestId('first_name-error').should('have.text', 'First name can use letters, spaces, apostrophes and periods only');
    saveButton().should('be.disabled');
  });

  it('PU-03 first name, last name and bio save and survive a reload; a cleared last name saves too', () => {
    const bio = `Board games and long walks, run ${account.stamp}`;
    openEditProfile();
    fill('field-first_name', 'Riya');
    fill('field-last_name', 'Duncit');
    fill('field-bio', bio);
    saveProfile();
    openAccount();
    cy.byTestId('account-profile-header').should('contain.text', 'Riya Duncit').and('contain.text', bio);
    cy.byTestId('account-edit').click();
    cy.byTestId('field-last_name').clear();
    saveProfile();
    openEditProfile();
    cy.byTestId('field-last_name').should('have.value', '');
    cy.byTestId('field-first_name').should('have.value', 'Riya');
  });

  it('PU-04 a bio over the limit is refused', () => {
    openEditProfile();
    fill('field-bio', 'a'.repeat(BIO_LIMIT + 1), { delay: 0 });
    cy.byTestId('bio-error').should('have.text', `Bio must be ${BIO_LIMIT} characters or fewer`);
    saveButton().should('be.disabled');
  });

  it('PU-05 closing with changes asks first; Keep editing keeps them and Discard drops them', () => {
    const unsaved = `Unsaved note ${account.stamp}`;
    openEditProfile();
    cy.byTestId('field-bio').invoke('val').then((saved) => {
      fill('field-bio', unsaved);
      tapOutsideEditDialog();
      cy.byTestId('edit-account-discard-confirm').should('contain.text', 'Discard unsaved changes?');
      cy.byTestId('edit-account-discard-confirm-cancel').should('contain.text', 'Keep editing').click();
      cy.byTestId('edit-account-discard-confirm').should('not.exist');
      cy.byTestId('field-bio').should('have.value', unsaved);
      tapOutsideEditDialog();
      cy.byTestId('edit-account-discard-confirm-confirm').should('contain.text', 'Discard').click();
      editDialog().should('not.exist');
      cy.byTestId('account-edit').click();
      cy.byTestId('field-bio').should('have.value', String(saved));
    });
  });

  it('PU-06 the username is checked as it is typed, and a free one saves', () => {
    openEditProfile();
    fill('field-username', 'Ab');
    cy.byTestId('username-error').should('have.text', 'Use 3–30 lowercase letters, numbers and single hyphens.');
    fill('field-username', 'admin');
    cy.byTestId('username-error').should('have.text', 'That username is reserved.');
    fill('field-username', handle);
    cy.byTestId('username-hint').should('have.text', `@${handle} is available.`);
    cy.byTestId('username-link-preview').should('contain.text', `/u/${handle}`);
    cy.interceptOperation('SetMyUsername');
    saveProfile();
    cy.wait('@SetMyUsername');
    openEditProfile();
    cy.byTestId('username-hint').should('have.text', 'This is your username.');
  });

  it('PU-07 a date of birth under the minimum age is refused, and a valid one saves', () => {
    minSignupAge().then((minAge) => {
      openEditProfile();
      typeDob(underAgeDob(minAge));
      cy.byTestId('dob-error').should('have.text', dobMinAgeMessage(minAge));
      saveButton().should('be.disabled');
    });
    typeDob(LATER_DOB);
    cy.byTestId('dob-error').should('not.exist');
    saveProfile();
    openEditProfile();
    expectDob(LATER_DOB);
  });

  it('PU-08 picking a country clears state and city; country, state and city save', () => {
    openEditProfile();
    pickOption('location-country', 'India');
    pickOption('location-state', 'Karnataka');
    fill('location-city', 'Bengaluru');
    pickOption('location-country', 'Nepal');
    cy.byTestId('location-state-trigger').should('have.value', '');
    cy.byTestId('location-city').should('have.value', '');
    pickOption('location-country', 'India');
    pickOption('location-state', 'Karnataka');
    cy.byTestId('location-city').type('Bengaluru');
    saveProfile();
    cy.byTestId('account-screen').should('contain.text', 'Bengaluru · Karnataka · India');
  });

  it('PU-09 a bad pincode is refused, and a full main address saves', () => {
    openEditProfile();
    fill('field-address_pincode', '01234');
    cy.byTestId('address_pincode-error').should('have.text', 'Enter a valid 6-digit pincode');
    saveButton().should('be.disabled');
    fill('field-address_line1', MAIN_ADDRESS.line1);
    fill('field-address_city', MAIN_ADDRESS.city);
    fill('field-address_state', MAIN_ADDRESS.state);
    fill('field-address_pincode', MAIN_ADDRESS.pincode);
    fill('field-address_country', MAIN_ADDRESS.country);
    saveProfile();
    openEditProfile();
    cy.byTestId('field-address_line1').should('have.value', MAIN_ADDRESS.line1);
    cy.byTestId('field-address_pincode').should('have.value', MAIN_ADDRESS.pincode);
  });

  it('PU-10 changing the email to the current address is refused', () => {
    openEditProfile();
    openContactChange('EMAIL');
    cy.byTestId('field-email').should('have.value', account.email);
    cy.byTestId('contact-change-send').should('contain.text', 'Send code').click();
    cy.byTestId('contact-change-error').should('contain.text', UNCHANGED);
  });

  it('PU-11 the email moves to a new address behind its code, then back to the run email', () => {
    const newAddress = account.address('new');
    openEditProfile();
    requestEmailChange(newAddress).then((code) => {
      cy.byTestId('change-contact-sheet').should('contain.text', `We sent a code to ${newAddress}.`);
      confirmEmailCode(wrongCode(code));
      cy.byTestId('contact-change-error').should('contain.text', 'Invalid OTP');
      confirmEmailCode(code);
    });
    cy.byTestId('change-contact-sheet').should('not.exist');
    cy.byTestId('contact-change-EMAIL-value').should('contain.text', newAddress);
    requestEmailChange(account.email).then(confirmEmailCode);
    cy.byTestId('change-contact-sheet').should('not.exist');
    cy.byTestId('contact-change-EMAIL-value').should('contain.text', account.email);
  });

  it('PU-12 changing the WhatsApp number to the current number is refused', () => {
    openEditProfile();
    openContactChange('WHATSAPP');
    cy.byTestId('field-number').should('have.value', account.phone);
    cy.byTestId('contact-change-send').should('contain.text', 'Send code').click();
    cy.byTestId('contact-change-error').should('contain.text', UNCHANGED);
  });

  it('PU-13 the phone number saves with Save number and no code, and is put back', () => {
    // The same number is refused as unchanged, so it moves to a run-owned number and back.
    const otherNumber = `9${account.stamp.replaceAll(/\D/g, '').slice(-9).padStart(9, '0')}`;
    openEditProfile();
    savePhoneNumber(otherNumber);
    cy.byTestId('contact-change-PHONE-value').should('contain.text', `+91 ${otherNumber}`);
    savePhoneNumber(account.phone);
    cy.byTestId('contact-change-PHONE-value').should('contain.text', `+91 ${account.phone}`);
  });

  it('PU-14 a JPG uploads through Adjust photo and shows as the profile photo', () => {
    openAccount();
    cy.fixture('avatar.jpg', null).as('avatar');
    cy.byTestId('avatar-file-input').selectFile('@avatar', { force: true });
    cy.byTestId('crop-dialog').should('be.visible').and('contain.text', 'Adjust photo');
    cy.interceptOperation('UploadAvatarImage');
    sendCode('UpdateProfilePhoto', () => {
      cy.byTestId('crop-confirm').should('contain.text', 'Save').and('be.enabled').click();
    });
    cy.wait('@UploadAvatarImage');
    cy.byTestId('crop-dialog').should('not.exist');
    avatarPhoto().should('have.attr', 'src').and('match', /^https:\/\//);
  });

  it('PU-15 Remove photo? › Remove clears the photo', () => {
    openAccount();
    avatarPhoto().should('exist');
    cy.byTestId('avatar-edit').click();
    cy.byTestId('photo-action-remove').click();
    cy.byTestId('remove-photo-confirm').should('contain.text', 'Remove photo?');
    sendCode('UpdateProfilePhoto', () => {
      cy.byTestId('remove-photo-confirm-confirm').should('contain.text', 'Remove').click();
    });
    avatarPhoto().should('not.exist');
    cy.byTestId('avatar-story-button-initial').should('be.visible');
    openAccount();
    avatarPhoto().should('not.exist');
    cy.byTestId('avatar-story-button-initial').should('be.visible');
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
      cy.byTestId('account-language-section').should('exist');
      htmlLang().then((original) => {
        const next = codes.find((code) => code !== original) ?? codes[0];
        pickLanguage(next);
        cy.byTestId('language-saved').should('be.visible');
        openAccount();
        htmlLang().should('eq', next);
        cy.gql(MY_LOCALE_QUERY).its('me.locale').should('eq', next);
        pickLanguage(String(original));
        cy.byTestId('language-saved').should('contain.text', 'Language updated');
      });
    });
  });

  it('PU-17 Private account survives a reload, and is put back', () => {
    openAccount();
    privateSwitch().then(($switch) => {
      const wasPrivate = $switch.is(':checked');
      toggleVisibility();
      openAccount();
      privateSwitch().should(wasPrivate ? 'not.be.checked' : 'be.checked');
      toggleVisibility();
      privateSwitch().should(wasPrivate ? 'be.checked' : 'not.be.checked');
    });
  });

  it('PU-18 /profile saves a description with one link, a blank link row notwithstanding', () => {
    const description = `Weekend hiker, run ${account.stamp}`;
    cy.visitApp('/profile');
    cy.byTestId('profile-about-section').should('contain.text', 'Description and links');
    cy.byTestId('profile-about-section-edit').click();
    fill('profile-about-edit-form-bio-input', description);
    linkBox('label', 0).clear();
    linkBox('label', 0).type('Duncit');
    linkBox('url', 0).clear();
    linkBox('url', 0).type('https://duncit.com');
    cy.byTestId('profile-about-edit-form-add-link').should('contain.text', 'Add link').click();
    linkBox('label', 1).should('have.value', '');
    sendCode('UpdateMyProfile', () => {
      cy.byTestId('profile-about-edit-form-save').should('contain.text', 'Save').click();
    });
    cy.byTestId('profile-about-section-saved').should('contain.text', 'Profile saved');
    cy.byTestId('profile-about-section-bio').should('contain.text', description);
    cy.byTestId('profile-about-section-link-Duncit-https://duncit.com')
      .should('be.visible')
      .and('have.text', 'Duncit')
      .and('have.attr', 'href', 'https://duncit.com');
  });
});
