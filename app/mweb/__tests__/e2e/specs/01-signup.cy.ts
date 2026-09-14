/// <reference types="cypress" />
import { dobMinAgeMessage } from '@duncit/datetime';
import {
  expectNoTestCode,
  fill,
  savedToken,
  sendAndReadCode,
  sendCode,
  wrongCode,
} from '../support/account-steps';
import { ADULT_DOB, expectDob, minSignupAge, underAgeDob } from '../support/dob';
import { runAccount } from '../support/run-account';
import {
  SIGNUP_NAME,
  acceptAllPolicies,
  fillContact,
  fillSecurity,
  fillWho,
  googleButton,
  logNoPolicies,
  onSignupStep,
  openSignup,
  policyBox,
  policyCheckbox,
  policyDialog,
  signupBack,
  signupNext,
  signupPolicyCount,
  walkToContact,
} from '../support/signup-steps';

/**
 * 01 — Join Duncit, live (stage SIGNUP).
 *
 * The validations come first and never create anything; then the real walk
 * creates the run account every later spec lives on. Its WhatsApp code is read
 * from the OTP testing API — the screen never shows one.
 */

const REFERRAL_CODE = 'DUN-A1B2C3';

/** One box on step 1, one bad value, the sentence under it. */
interface StepOneRefusal {
  title: string;
  box: 'name' | 'referralCode';
  value: string;
  message: string;
}

const STEP_ONE_REFUSALS = {
  nameWithDigits: {
    title: 'SU-03 a name with digits is refused',
    box: 'name',
    value: 'R2D2',
    message: 'Name can use letters, spaces, apostrophes and periods only',
  },
  oneLetterName: {
    title: 'SU-04 a one-letter name is refused',
    box: 'name',
    value: 'R',
    message: 'Name must be at least 2 characters',
  },
  badReferralCode: {
    title: 'SU-06 a referral code of the wrong shape is refused',
    box: 'referralCode',
    value: 'abc',
    message: 'Enter a code like DUN-XXXXXX',
  },
} satisfies Record<string, StepOneRefusal>;

function itRefusesOnStepOne({ title, box, value, message }: Readonly<StepOneRefusal>): void {
  it(title, () => {
    openSignup();
    cy.byTestId(`field-${box}`).type(value);
    signupNext().click();
    cy.byTestId(`${box}-error`).should('have.text', message);
    onSignupStep(1);
  });
}

const verifyButton = () => cy.byTestId('signup-verify');
const verifyError = () => cy.byTestId('signup-verify-error');
const interestChip = (index: number) => cy.byTestIdPrefix('chip-').eq(index);
const findMyCrew = () => cy.byTestId('survey-submit');

describe('01 Sign up', () => {
  const account = runAccount();
  const phoneTarget = { phone: account.phone };

  describe('step 1 — who you are', () => {
    it('SU-01 signed out, /register opens on step 1 with Continue, Google and Log in', () => {
      openSignup();
      signupNext().should('contain.text', 'Continue');
      googleButton().should('exist');
      cy.byTestId('signup-screen').should('contain.text', 'Already have an account?');
      cy.byTestId('go-login').should('have.text', 'Log in').and('have.attr', 'href', '/login');
    });

    it('SU-02 Continue with step 1 empty asks for the name and the date of birth', () => {
      openSignup();
      signupNext().click();
      cy.byTestId('name-error').should('have.text', 'Name is required');
      cy.byTestId('dob-error').should('have.text', 'Date of birth is required');
      onSignupStep(1);
    });

    itRefusesOnStepOne(STEP_ONE_REFUSALS.nameWithDigits);
    itRefusesOnStepOne(STEP_ONE_REFUSALS.oneLetterName);

    it('SU-05 a date of birth under the admin minimum age is refused', () => {
      minSignupAge().then((minAge) => {
        openSignup();
        fillWho(SIGNUP_NAME, underAgeDob(minAge));
        signupNext().click();
        cy.byTestId('dob-error').should('have.text', dobMinAgeMessage(minAge));
        onSignupStep(1);
      });
    });

    itRefusesOnStepOne(STEP_ONE_REFUSALS.badReferralCode);

    it('SU-07 a referral link arrives with its code filled in', () => {
      openSignup(`/register?ref=${REFERRAL_CODE}`);
      cy.byTestId('field-referralCode').should('have.value', REFERRAL_CODE);
    });
  });

  // One page from here to SU-14: each scenario picks up the form the last one left.
  describe('steps 2 and 3 — refusals that create nothing', { testIsolation: false }, () => {
    it('SU-08 Continue with step 2 empty asks for the number and the email', () => {
      openSignup();
      fillWho(SIGNUP_NAME, ADULT_DOB, REFERRAL_CODE);
      signupNext().click();
      onSignupStep(2);
      signupNext().click();
      cy.byTestId('phoneNumber-error').should('have.text', 'Phone number is required');
      cy.byTestId('email-error').should('have.text', 'Email is required');
    });

    it('SU-09 a WhatsApp number that is too short is refused', () => {
      cy.byTestId('field-phoneNumber').type('12345');
      signupNext().click();
      cy.byTestId('phoneNumber-error').should('have.text', 'Enter a phone number — digits only, 6 to 15');
      onSignupStep(2);
    });

    it('SU-10 an incomplete email is refused', () => {
      cy.byTestId('field-email').type('riya@');
      signupNext().click();
      cy.byTestId('email-error').should('have.text', 'Enter a valid email');
      onSignupStep(2);
    });

    it('SU-11 Back from step 2 keeps the name, date of birth and referral code', () => {
      signupBack().click();
      onSignupStep(1);
      cy.byTestId('field-name').should('have.value', SIGNUP_NAME);
      expectDob(ADULT_DOB);
      cy.byTestId('field-referralCode').should('have.value', REFERRAL_CODE);
    });

    it('SU-12 a short password and a confirmation that differs are refused', () => {
      cy.byTestId('field-referralCode').clear();
      signupNext().click();
      fillContact(account.phone, account.email);
      signupNext().should('be.enabled').click();
      fillSecurity('short', account.password('CHANGED'));
      signupNext().click();
      cy.byTestId('password-error').should('have.text', 'Min 8 characters');
      cy.byTestId('confirmPassword-error').should('have.text', 'Passwords do not match');
      onSignupStep(3);
    });

    it('SU-13 Create account with the policies unticked is refused', () => {
      fillSecurity(account.password('SIGNUP'));
      signupPolicyCount().then((total) => {
        if (total === 0) {
          logNoPolicies();
          return;
        }
        signupNext().should('contain.text', 'Create account').click();
        cy.byTestId('acceptedPolicyIds-error').should('have.text', 'Accept every policy before creating your account');
        onSignupStep(3);
      });
    });

    it('SU-14 the policies dialog keeps partial ticks on Close, and Accept all ticks every one', () => {
      signupPolicyCount().then((total) => {
        if (total === 0) {
          logNoPolicies();
          return;
        }
        policyBox().click();
        cy.byTestIdPrefix('policy-accept-').first().click();
        cy.byTestId('policy-acceptance-count').should('have.text', `1 of ${total} accepted`);
        cy.byTestId('policy-acceptance-close').click();
        policyDialog().should('not.exist');
        // With one policy that tick is the whole set, so the box is already
        // ticked and pressing it clears the set; it reopens on 0 of 1.
        const onlyPolicy = total === 1;
        const reopenedWith = onlyPolicy ? 0 : 1;
        if (onlyPolicy) {
          policyCheckbox().should('be.checked');
          policyBox().click();
        }
        policyBox().click();
        cy.byTestId('policy-acceptance-count').should('have.text', `${reopenedWith} of ${total} accepted`);
        cy.byTestId('policy-acceptance-accept-all').click();
        policyDialog().should('not.exist');
        policyCheckbox().should('be.checked');
      });
    });
  });

  // The real walk: SU-15 creates nothing until SU-18 proves the number.
  describe('creating the run account', { testIsolation: false }, () => {
    let signupCode = '';

    it('SU-15 Create account opens step 4, which names the number and shows no test code', () => {
      openSignup();
      fillWho(SIGNUP_NAME, ADULT_DOB);
      signupNext().click();
      fillContact(account.phone, account.email);
      signupNext().should('be.enabled').click();
      fillSecurity(account.password('SIGNUP'));
      acceptAllPolicies();
      sendAndReadCode('WHATSAPP_SIGNUP', phoneTarget, 'RequestSignupWhatsAppOtp', () => {
        signupNext().click();
      }).then((code) => {
        signupCode = code;
      });
      onSignupStep(4);
      cy.byTestId('signup-screen').should(
        'contain.text',
        `We sent a 6-digit code to +91 ${account.phone} on WhatsApp.`,
      );
      expectNoTestCode('signup-test-code');
    });

    it('SU-16 a wrong code is refused with the attempts left', () => {
      cy.byTestId('field-otp').type(wrongCode(signupCode));
      sendCode('VerifySignupWhatsAppOtp', () => {
        verifyButton().should('be.enabled').click();
      });
      verifyError().should('contain.text', 'Incorrect code — 4 attempts left');
    });

    it('SU-17 Send again inside 30 seconds is refused', () => {
      sendCode('RequestSignupWhatsAppOtp', () => {
        cy.byTestId('signup-resend').should('have.text', 'Send again').click();
      });
      verifyError().invoke('text').should('match', /^Wait \d+s before asking for another code$/);
    });

    it('SU-18 the code and Verify number create the account, save a token and open the survey', () => {
      fill('field-otp', signupCode);
      cy.interceptOperation('Register');
      verifyButton().should('contain.text', 'Verify number').click();
      cy.wait('@Register');
      cy.location('pathname').should('eq', '/signup-survey');
      savedToken().should('be.a', 'string').and('not.be.empty');
    });

    it('SU-19 the survey needs three interests, then lands on Home', () => {
      cy.byTestId('survey-screen')
        .should('contain.text', "What's your vibe?")
        .and('contain.text', 'Pick at least 3 interests across categories to find your tribe.');
      findMyCrew().should('be.disabled');
      interestChip(0).click();
      interestChip(1).click();
      findMyCrew().should('be.disabled');
      interestChip(2).click();
      sendCode('SaveInterests', () => {
        findMyCrew().should('be.enabled').click();
      });
      cy.location('pathname').should('eq', '/');
    });
  });

  describe('with the account created', () => {
    it('SU-20 signed in, /register goes to Home', () => {
      cy.apiLogin(account.email, account.password('SIGNUP'));
      cy.visitApp('/register');
      cy.location('pathname').should('eq', '/');
    });

    it('SU-21 its email is refused on step 2 and Continue stays disabled', () => {
      walkToContact(SIGNUP_NAME, ADULT_DOB);
      cy.byTestId('field-email').type(account.email);
      cy.byTestId('email-error').should(
        'have.text',
        'This email is already registered. Log in instead, or use a different email.',
      );
      signupNext().should('be.disabled');
      onSignupStep(2);
    });

    it('SU-22 its WhatsApp number is refused on step 2', () => {
      walkToContact(SIGNUP_NAME, ADULT_DOB);
      cy.byTestId('field-phoneNumber').type(account.phone);
      cy.byTestId('phoneNumber-error').should(
        'have.text',
        'This number is already registered. Log in instead, or use a different number.',
      );
      signupNext().should('be.disabled');
      onSignupStep(2);
    });
  });
});
