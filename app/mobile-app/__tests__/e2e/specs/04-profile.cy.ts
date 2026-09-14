import {
  expectDisabled,
  expectEnabled,
  fill,
  minSignupAge,
  openAccount,
  openEditProfile,
  pickDob,
  saveProfile,
  tap,
  typeDob,
  wrongCode,
  yearsAgo,
} from '../support/flows';
import { runAccount } from '../support/run-account';

/**
 * 04 · Profile (PU), signed in with the RECOVERED password.
 *
 * Native web: src/screens/AccountScreen, the Edit profile sheet
 * (src/components/account/EditAccountDialog + src/forms/account-edit), the
 * contact rows (src/components/contact-change) and the avatar
 * (src/components/profile/ProfileAvatar).
 */
describe('Native · 04 profile', () => {
  const account = runAccount();
  const UNCHANGED = 'That is what your account already has.';

  const ME = `query E2eMe { me { last_name dob address { line1 pincode } locale } }`;
  type Me = {
    me: {
      last_name: string | null;
      dob: string | null;
      address: { line1: string | null; pincode: string | null } | null;
      locale: string | null;
    };
  };
  const readMe = () => cy.gql<Me>(ME).its('me');

  const LANGUAGES = `query E2eLanguages {
    publicFeatureFlags { key enabled }
    publicLocales { code is_default }
    me { locale }
  }`;
  type Languages = {
    publicFeatureFlags: { key: string; enabled: boolean }[];
    publicLocales: { code: string; is_default: boolean }[];
    me: { locale: string | null };
  };
  type LanguagePair = { original: string; other: string };

  /**
   * The language to switch to and the one to put back — or null when
   * LanguageSection renders nothing (the `language_preference` flag is off, or
   * fewer than two locales exist).
   */
  const languagePair = (data: Languages): LanguagePair | null => {
    const flag = data.publicFeatureFlags.find((item) => item.key === 'language_preference');
    if (!flag?.enabled || data.publicLocales.length < 2) return null;
    const fallback = data.publicLocales.find((item) => item.is_default)?.code ?? '';
    const original = data.me.locale ?? fallback;
    const other = data.publicLocales.find((item) => item.code !== original)?.code ?? '';
    return { original, other };
  };

  const chooseLanguage = (code: string, alias: string): void => {
    cy.interceptOperation('MobileSetMyLocale', alias);
    tap(`locale-option-${code}`);
    cy.wait(`@${alias}`);
  };

  const switchLanguageAndBack = ({ original, other }: LanguagePair): void => {
    chooseLanguage(other, 'switchLanguage');
    cy.reload();
    cy.byTestId('account-language-section').should('exist');
    readMe().its('locale').should('eq', other);
    chooseLanguage(original, 'restoreLanguage');
    readMe().its('locale').should('eq', original);
  };

  beforeEach(() => {
    cy.apiLogin(account.email, account.password('RECOVERED'));
    openAccount();
  });

  /** Pick one option on a searchable select sheet (src/forms/components/SelectSheet). */
  const choose = (select: string, option: string): void => {
    tap(`${select}-trigger`);
    cy.byTestId(`${select}-search`).type(option, { delay: 0 });
    tap(`${select}-option-${option}`);
    cy.byTestId(`${select}-sheet`).should('not.exist');
  };

  /** Open one contact row's change sheet. */
  const openContact = (channel: 'EMAIL' | 'PHONE' | 'WHATSAPP'): void => {
    tap(`contact-change-${channel}`);
    cy.byTestId('change-contact-sheet').should('be.visible');
  };

  /** Move the account's email with the code the server holds for the new address. */
  const changeEmailTo = (email: string): void => {
    openContact('EMAIL');
    fill('field-email', email);
    cy.lastOtpIssuedAt('EMAIL_VERIFICATION', { email }).then((before) => {
      cy.interceptOperation('MobileRequestEmailChangeOtp');
      tap('contact-change-send');
      cy.wait('@MobileRequestEmailChangeOtp');
      cy.readOtp('EMAIL_VERIFICATION', { email }, before).as('emailCode', { type: 'static' });
    });
  };

  const verifyContactCode = (code: string): void => {
    fill('field-otp', code);
    cy.interceptOperation('MobileConfirmEmailChange');
    tap('contact-change-verify');
    cy.wait('@MobileConfirmEmailChange');
  };

  /** Store a contact number through its direct save (no code). */
  const savePhone = (number: string): void => {
    openContact('PHONE');
    fill('field-number', number);
    cy.interceptOperation('MobileSetContactPhoneNumber');
    tap('contact-change-send');
    cy.wait('@MobileSetContactPhoneNumber');
    cy.byTestId('change-contact-sheet').should('not.exist');
    cy.byTestId('edit-account-dialog').should('contain', number);
  };

  it('PU-01 Edit opens Edit profile, and Save waits for a change', () => {
    openEditProfile();
    expectDisabled('account-edit-submit');
    cy.byTestId('field-bio').type(' E2E', { delay: 0 });
    expectEnabled('account-edit-submit');
  });

  it('PU-02 the first name is required and takes letters only', () => {
    openEditProfile();
    cy.byTestId('field-first_name').clear();
    cy.byTestId('first_name-error').should('have.text', 'First name is required');
    cy.byTestId('field-first_name').type('Riya2', { delay: 0 });
    cy.byTestId('first_name-error').should(
      'have.text',
      'First name can use letters, spaces, apostrophes and periods only',
    );
    expectDisabled('account-edit-submit');
  });

  it('PU-03 first name, last name and bio save and survive a reload; a blank last name saves too', () => {
    const bio = `E2E run ${account.stamp}`;
    openEditProfile();
    fill('field-first_name', 'Riya');
    fill('field-last_name', 'Tester');
    fill('field-bio', bio);
    saveProfile();
    cy.byTestId('account-screen').should('contain', 'Riya Tester').and('contain', bio);
    cy.reload();
    cy.byTestId('account-screen').should('contain', 'Riya Tester').and('contain', bio);

    openEditProfile();
    cy.byTestId('field-last_name').clear();
    saveProfile();
    cy.reload();
    cy.byTestId('account-screen').should('not.contain', 'Tester');
    readMe().its('last_name').should('be.oneOf', ['', null]);
  });

  it('PU-04 a bio over 500 characters is refused', () => {
    openEditProfile();
    fill('field-bio', 'a'.repeat(501));
    cy.byTestId('bio-error').should('have.text', 'Bio must be 500 characters or fewer');
    expectDisabled('account-edit-submit');
  });

  it('PU-05 closing with changes asks first: Keep editing keeps them, Discard drops them', () => {
    const draft = `Draft ${account.stamp}`;
    openEditProfile();
    fill('field-bio', draft);
    tap('edit-account-close');
    cy.byTestId('edit-account-discard-confirm').should('contain', 'Discard unsaved changes?');
    cy.byTestId('edit-account-discard-confirm-cancel').should('contain', 'Keep editing').click();
    cy.byTestId('edit-account-discard-confirm').should('not.exist');
    cy.byTestId('field-bio').should('have.value', draft);

    tap('edit-account-close');
    cy.byTestId('edit-account-discard-confirm-confirm').should('contain', 'Discard').click();
    cy.byTestId('edit-account-dialog').should('not.exist');
    openEditProfile();
    cy.byTestId('field-bio').should('not.have.value', draft);
  });

  it('PU-06 the username refuses a bad shape and a reserved name, and saves a free one', () => {
    const handle = `e2e-${account.stamp}`;
    openEditProfile();
    fill('field-username', 'Ab');
    cy.byTestId('username-error').should(
      'have.text',
      'Use 3–30 lowercase letters, numbers and single hyphens.',
    );
    cy.interceptOperation('MobileUsernameAvailability', 'reservedCheck');
    fill('field-username', 'admin');
    cy.wait('@reservedCheck');
    cy.byTestId('username-error').should('have.text', 'That username is reserved.');

    cy.interceptOperation('MobileUsernameAvailability', 'freeCheck');
    fill('field-username', handle);
    cy.wait('@freeCheck');
    cy.byTestId('username-hint').should('have.text', `@${handle} is available.`);
    cy.byTestId('username-link-preview').should('contain', handle);

    cy.interceptOperation('MobileSetUsername');
    saveProfile();
    cy.wait('@MobileSetUsername');
    openEditProfile();
    cy.byTestId('field-username').should('have.value', handle);
    cy.byTestId('username-hint').should('have.text', 'This is your username.');
  });

  it('PU-07 a birthday under the minimum age is refused, and a valid one saves', () => {
    const today = new Date();
    const year = today.getFullYear() - 30;
    minSignupAge().then((minAge) => {
      openEditProfile();
      typeDob(yearsAgo(minAge - 1));
      cy.byTestId('dob-error').should(
        'have.text',
        `You must be at least ${minAge} years old to join Duncit`,
      );
    });
    pickDob(year, 20);
    cy.byTestId('dob-error').should('not.exist');
    saveProfile();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    readMe()
      .its('dob')
      .should('match', new RegExp(`^${year}-${month}-20`));
  });

  it('PU-08 picking a country clears state and city; country, state and city save', () => {
    openEditProfile();
    choose('location-country', 'India');
    choose('location-state', 'Karnataka');
    fill('location-city', 'Bengaluru');
    choose('location-country', 'Nepal');
    cy.byTestId('location-state-trigger').should('contain', 'Select state');
    cy.byTestId('location-city').should('have.value', '');

    choose('location-country', 'India');
    choose('location-state', 'Karnataka');
    fill('location-city', 'Bengaluru');
    saveProfile();
    cy.reload();
    cy.byTestId('account-screen').should('contain', 'Bengaluru · Karnataka · India');
  });

  it('PU-09 a bad pincode is refused, and a full main address saves', () => {
    openEditProfile();
    fill('field-address_pincode', '01234');
    cy.byTestId('address_pincode-error').should('have.text', 'Enter a valid 6-digit pincode');
    fill('field-address_line1', '12 MG Road');
    fill('field-address_line2', 'Floor 2');
    fill('field-address_landmark', 'Near the metro');
    fill('field-address_city', 'Bengaluru');
    fill('field-address_state', 'Karnataka');
    fill('field-address_pincode', '560001');
    fill('field-address_country', 'India');
    saveProfile();
    readMe().its('address').should('deep.include', { line1: '12 MG Road', pincode: '560001' });
  });

  it('PU-10 an email change to the current address is refused', () => {
    openEditProfile();
    openContact('EMAIL');
    cy.byTestId('field-email').should('have.value', account.email);
    tap('contact-change-send');
    cy.byTestId('contact-change-error').should('have.text', UNCHANGED);
  });

  it('PU-11 the email moves to a new address with its code, and back again', () => {
    const next = account.address('new');
    openEditProfile();
    changeEmailTo(next);
    cy.get<string>('@emailCode').then((code) => {
      verifyContactCode(wrongCode(code));
      cy.byTestId('contact-change-error').should('have.text', 'Invalid OTP');
      verifyContactCode(code);
    });
    cy.byTestId('change-contact-sheet').should('not.exist');
    cy.byTestId('edit-account-dialog').should('contain', next);

    changeEmailTo(account.email);
    cy.get<string>('@emailCode').then(verifyContactCode);
    cy.byTestId('change-contact-sheet').should('not.exist');
    cy.byTestId('edit-account-dialog').should('contain', account.email);
  });

  it('PU-12 a WhatsApp change to the current number is refused', () => {
    openEditProfile();
    openContact('WHATSAPP');
    cy.byTestId('field-number').should('have.value', account.phone);
    tap('contact-change-send');
    cy.byTestId('contact-change-error').should('have.text', UNCHANGED);
  });

  it('PU-13 the phone number saves with Save number and no code', () => {
    // The UI refuses the same number, so the run's number is moved and put back.
    const interim = `9${account.stamp.slice(-9)}`;
    openEditProfile();
    openContact('PHONE');
    cy.byTestId('change-contact-sheet').should(
      'contain',
      'This is the number Duncit will reach you on. It is saved as soon as you enter it.',
    );
    cy.byTestId('contact-change-send').should('contain', 'Save number');
    tap('contact-change-send');
    cy.byTestId('contact-change-error').should('have.text', UNCHANGED);
    tap('change-contact-sheet-close');
    cy.byTestId('change-contact-sheet').should('not.exist');

    savePhone(interim);
    savePhone(account.phone);
  });

  it('PU-14 a JPG goes through Adjust photo › Save and becomes the profile photo', () => {
    tap('avatar-story-button-edit');
    cy.fixture('avatar.jpg', null).as('avatar');
    tap('photo-action-change');
    // expo-image-picker's web picker is a hidden file input it appends to the
    // page; its programmatic click opens no dialog under automation, so the
    // file is handed to the input directly.
    cy.byTestId('file-input').selectFile('@avatar', {
      force: true,
    });
    cy.byTestId('crop-dialog').should('be.visible').and('contain', 'Adjust photo');
    cy.interceptOperation('MobileUploadImage');
    cy.interceptOperation('MobileUpdateMyProfile');
    cy.byTestId('crop-confirm').should('contain', 'Save').click();
    cy.wait('@MobileUploadImage');
    cy.wait('@MobileUpdateMyProfile');
    cy.byTestId('crop-dialog').should('not.exist');
    cy.byTestId('avatar-story-button-photo').should('exist');
    cy.reload();
    cy.byTestId('avatar-story-button-photo').should('exist');
  });

  it('PU-15 Remove photo? › Remove clears the photo', () => {
    tap('avatar-story-button-edit');
    tap('photo-action-remove');
    cy.byTestId('remove-photo-confirm').should('contain', 'Remove photo?');
    cy.interceptOperation('MobileUpdateMyProfile');
    cy.byTestId('remove-photo-confirm-confirm').should('contain', 'Remove').click();
    cy.wait('@MobileUpdateMyProfile');
    cy.byTestId('avatar-story-button-photo').should('not.exist');
    cy.byTestId('avatar-story-button-initial').should('be.visible');
    cy.reload();
    cy.byTestId('avatar-story-button-photo').should('not.exist');
    cy.byTestId('avatar-story-button-initial').should('be.visible');
  });

  it('PU-16 the language choice survives a reload, and is put back', function () {
    cy.gql<Languages>(LANGUAGES).then((data) => {
      const pair = languagePair(data);
      if (pair) {
        switchLanguageAndBack(pair);
      } else {
        // The picker is not rendered: the language flag is off or there are fewer than two locales.
        this.skip();
      }
    });
  });
});
