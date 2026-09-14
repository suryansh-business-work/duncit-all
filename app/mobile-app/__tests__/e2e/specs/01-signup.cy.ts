import { APP_TOKEN_KEY } from '../support/commands';
import {
  expectDisabled,
  expectEnabled,
  expectHome,
  fill,
  minSignupAge,
  pickDob,
  tap,
  typeDob,
  wrongCode,
  yearsAgo,
} from '../support/flows';
import { runAccount } from '../support/run-account';

/**
 * 01 · Signup (SU). Validations first, with values that never create anything;
 * then the real walk that creates the run account (password stage SIGNUP).
 *
 * Native web: src/screens/SignupScreen + src/forms/signup; the date of birth is
 * the calendar sheet in src/forms/account-edit/DobDateField.tsx.
 */
describe('Native · 01 signup', () => {
  const account = runAccount();
  const NAME = 'Riya Duncit';
  const DIAL_CODE = '+91';
  let minAge = 0;

  before(() => {
    minSignupAge().then((age) => {
      minAge = age;
    });
  });

  /** Step one filled with a name and a birthday well over the minimum age. */
  const fillWho = (): void => {
    fill('field-name', NAME);
    pickDob(new Date().getFullYear() - (minAge + 10), 15);
  };

  /** Steps one and two filled with the run's own (still free) contacts. */
  const reachSecurityStep = (): void => {
    cy.visitApp('/signup');
    fillWho();
    tap('signup-next');
    fill('field-phoneNumber', account.phone);
    fill('field-email', account.email);
    // Continue stays shut while the server checks both are free.
    tap('signup-next');
    cy.byTestId('field-password').should('be.visible');
  };

  describe('validations', () => {
    beforeEach(() => {
      cy.clearAuth();
    });

    it('SU-01 signed out, /signup opens on step 1 with Continue, Google and Log in', () => {
      cy.visitApp('/signup');
      cy.location('pathname').should('eq', '/signup');
      cy.byTestId('field-name').should('be.visible');
      cy.byTestId('signup-next').should('contain', 'Continue');
      cy.byTestId('google-auth-button').should('be.visible');
      cy.byTestId('signup-screen').should('contain', 'Already have an account?');
      cy.byTestId('go-login').should('have.text', 'Log in');
    });

    it('SU-02 Continue with step 1 empty asks for the name and the date of birth', () => {
      cy.visitApp('/signup');
      tap('signup-next');
      cy.byTestId('name-error').should('have.text', 'Name is required');
      cy.byTestId('dob-error').should('have.text', 'Date of birth is required');
    });

    it('SU-03 a name with digits is refused', () => {
      cy.visitApp('/signup');
      fill('field-name', 'R2D2');
      tap('signup-next');
      cy.byTestId('name-error').should(
        'have.text',
        'Name can use letters, spaces, apostrophes and periods only',
      );
    });

    it('SU-04 a one-letter name is too short', () => {
      cy.visitApp('/signup');
      fill('field-name', 'R');
      tap('signup-next');
      cy.byTestId('name-error').should('have.text', 'Name must be at least 2 characters');
    });

    it('SU-05 a birthday under the minimum age cannot be picked, and typed says so', () => {
      cy.visitApp('/signup');
      const latest = yearsAgo(minAge);
      tap('dob-open');
      cy.byTestId(`dob-year-${latest.getFullYear()}`).should('exist');
      cy.byTestId(`dob-year-${latest.getFullYear() + 1}`).should('not.exist');
      tap('dob-next-month');
      expectDisabled('dob-day-1');
      cy.byTestId('dob-sheet-backdrop').click('topLeft');
      cy.byTestId('dob-sheet').should('not.exist');

      typeDob(yearsAgo(minAge - 1));
      cy.byTestId('dob-error').should(
        'have.text',
        `You must be at least ${minAge} years old to join Duncit`,
      );
    });

    it('SU-06 a referral code in the wrong shape is refused', () => {
      cy.visitApp('/signup');
      fill('field-referralCode', 'abc');
      tap('signup-next');
      cy.byTestId('referralCode-error').should('have.text', 'Enter a code like DUN-XXXXXX');
    });

    it('SU-08 Continue with step 2 empty asks for the number and the email', () => {
      cy.visitApp('/signup');
      fillWho();
      tap('signup-next');
      cy.byTestId('field-phoneNumber').should('be.visible');
      tap('signup-next');
      cy.byTestId('phoneNumber-error').should('have.text', 'Phone number is required');
      cy.byTestId('email-error').should('have.text', 'Email is required');
    });

    it('SU-09 a five-digit WhatsApp number is refused', () => {
      cy.visitApp('/signup');
      fillWho();
      tap('signup-next');
      fill('field-phoneNumber', '12345');
      tap('signup-next');
      cy.byTestId('phoneNumber-error').should(
        'have.text',
        'Enter a phone number — digits only, 6 to 15',
      );
    });

    it('SU-10 a half-typed email is refused', () => {
      cy.visitApp('/signup');
      fillWho();
      tap('signup-next');
      fill('field-email', 'riya@');
      tap('signup-next');
      cy.byTestId('email-error').should('have.text', 'Enter a valid email');
    });

    it('SU-11 Back from step 2 keeps the name, date of birth and referral code', () => {
      cy.visitApp('/signup');
      fillWho();
      fill('field-referralCode', 'DUN-A1B2C3');
      tap('signup-next');
      cy.byTestId('field-phoneNumber').should('be.visible');
      tap('signup-back');
      cy.byTestId('field-name').should('have.value', NAME);
      cy.byTestId('field-dob').should('not.have.value', '');
      cy.byTestId('field-referralCode').should('have.value', 'DUN-A1B2C3');
    });

    it('SU-12 a short password and a different confirmation are refused', () => {
      reachSecurityStep();
      cy.byTestId('field-password').type('short', { delay: 0 });
      cy.byTestId('field-password').blur();
      cy.byTestId('password-error').should('have.text', 'Min 8 characters');

      fill('field-password', account.password('SIGNUP'));
      cy.byTestId('field-confirmPassword').type(`${account.password('SIGNUP')}-x`, { delay: 0 });
      cy.byTestId('field-confirmPassword').blur();
      cy.byTestId('confirmPassword-error').should('have.text', 'Passwords do not match');
    });

    it('SU-13 Create account stays shut while the policies are unticked', () => {
      reachSecurityStep();
      fill('field-password', account.password('SIGNUP'));
      fill('field-confirmPassword', account.password('SIGNUP'));
      cy.byTestId('signup-next').should('contain', 'Create account');
      expectDisabled('signup-next');
      cy.byTestId('signup-policies-hint').should('have.text', 'Accept every policy to continue.');
    });

    it('SU-14 the policies sheet keeps partial ticks on Close, and Accept all ticks every one', () => {
      reachSecurityStep();
      tap('signup-policies-checkbox');
      cy.byTestId('policy-acceptance-sheet')
        .should('be.visible')
        .and('contain', 'Policies you need to accept');
      cy.get('[data-testid^="policy-accept-"]')
        .should('have.length.at.least', 1)
        .its('length')
        .then((total) => {
          expect(total, 'staging gates signup on more than one policy').to.be.greaterThan(1);
          cy.get('[data-testid^="policy-accept-"]').first().click();
          cy.byTestId('policy-acceptance-count').should('have.text', `1 of ${total} accepted`);
          tap('policy-acceptance-close');
          cy.byTestId('policy-acceptance-sheet').should('not.exist');

          tap('signup-policies-checkbox');
          cy.byTestId('policy-acceptance-count').should('have.text', `1 of ${total} accepted`);
          tap('policy-acceptance-accept-all');
        });
      cy.byTestId('policy-acceptance-sheet').should('not.exist');
      cy.byTestId('signup-policies-checkbox').should('have.attr', 'aria-checked', 'true');
      cy.byTestId('signup-policies-hint').should('not.exist');
    });
  });

  // One continuous signup: the code step only exists inside the page that
  // reached it, so these scenarios share the page rather than each reloading.
  describe('the real walk', { testIsolation: false }, () => {
    let issuedBefore = '';
    let heldCode = '';

    it('SU-15 step 4 names the WhatsApp number the code went to, with no test code', () => {
      cy.clearAuth();
      cy.visitApp('/signup');
      fillWho();
      tap('signup-next');
      fill('field-phoneNumber', account.phone);
      fill('field-email', account.email);
      tap('signup-next');
      fill('field-password', account.password('SIGNUP'));
      fill('field-confirmPassword', account.password('SIGNUP'));
      tap('signup-policies-checkbox');
      tap('policy-acceptance-accept-all');
      expectEnabled('signup-next');

      // The code is sent the moment step 4 opens, so the baseline comes first.
      cy.lastOtpIssuedAt('WHATSAPP_SIGNUP', { phone: account.phone }).then((issuedAt) => {
        issuedBefore = issuedAt;
      });
      cy.interceptOperation('MobileRequestSignupWhatsAppOtp');
      tap('signup-next');
      cy.wait('@MobileRequestSignupWhatsAppOtp');
      cy.byTestId('signup-screen').should(
        'contain',
        `We sent a 6-digit code to ${DIAL_CODE} ${account.phone} on WhatsApp.`,
      );
      cy.byTestId('signup-test-code').should('not.exist');
    });

    it('SU-16 a wrong code says how many attempts are left', () => {
      cy.readOtp('WHATSAPP_SIGNUP', { phone: account.phone }, issuedBefore).then((code) => {
        heldCode = code;
        fill('field-otp', wrongCode(code));
      });
      cy.interceptOperation('MobileVerifySignupWhatsAppOtp');
      tap('signup-verify');
      cy.wait('@MobileVerifySignupWhatsAppOtp');
      cy.byTestId('signup-verify-error').should('have.text', 'Incorrect code — 4 attempts left');
    });

    it('SU-17 Send again inside 30 seconds is asked to wait', () => {
      cy.interceptOperation('MobileRequestSignupWhatsAppOtp');
      cy.byTestId('signup-resend').should('have.text', 'Send again').click();
      cy.wait('@MobileRequestSignupWhatsAppOtp');
      cy.byTestId('signup-verify-error')
        .invoke('text')
        .should('match', /^Wait \d+s before asking for another code$/);
    });

    it('SU-18 the held code creates the account, saves a token and opens the survey', () => {
      fill('field-otp', heldCode);
      cy.interceptOperation('MobileVerifySignupWhatsAppOtp');
      cy.interceptOperation('MobileRegister');
      tap('signup-verify');
      cy.wait('@MobileVerifySignupWhatsAppOtp');
      cy.wait('@MobileRegister');
      cy.byTestId('survey-screen').should('exist');
      cy.location('pathname').should('eq', '/survey');
      cy.window()
        .its('localStorage')
        .invoke('getItem', APP_TOKEN_KEY)
        .should('be.a', 'string')
        .and('not.be.empty');
    });

    it('SU-19 the survey needs three interests, then lands on Home', () => {
      cy.get('[data-testid^="chip-"]').should('have.length.at.least', 3);
      cy.get('[data-testid^="chip-"]').eq(0).click();
      cy.get('[data-testid^="chip-"]').eq(1).click();
      cy.get('[data-testid^="chip-"]').eq(1).should('have.attr', 'aria-pressed', 'true');
      expectDisabled('survey-submit');
      cy.byTestId('survey-screen').should(
        'contain',
        'Pick at least 3 interests across categories to find your tribe.',
      );

      cy.get('[data-testid^="chip-"]').eq(2).click();
      cy.interceptOperation('MobileSaveInterests');
      tap('survey-submit');
      cy.wait('@MobileSaveInterests');
      expectHome();
    });
  });

  describe('the account now exists', () => {
    beforeEach(() => {
      // Signed out: a fresh boot with no session.
      cy.clearAuth();
      cy.visitApp('/signup');
      fillWho();
      tap('signup-next');
      cy.interceptOperation('MobileSignupContactAvailability');
    });

    it('SU-21 its email is already registered, and Continue stays shut', () => {
      fill('field-email', account.email);
      cy.wait('@MobileSignupContactAvailability');
      cy.byTestId('email-error').should(
        'have.text',
        'This email is already registered. Log in instead, or use a different email.',
      );
      expectDisabled('signup-next');
    });

    it('SU-22 its WhatsApp number is already registered', () => {
      fill('field-phoneNumber', account.phone);
      cy.wait('@MobileSignupContactAvailability');
      cy.byTestId('phoneNumber-error').should(
        'have.text',
        'This number is already registered. Log in instead, or use a different number.',
      );
      expectDisabled('signup-next');
    });
  });
});
