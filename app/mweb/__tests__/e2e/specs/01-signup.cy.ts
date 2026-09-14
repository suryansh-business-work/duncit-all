/// <reference types="cypress" />
import { dobMinAgeMessage } from '@duncit/datetime';
import {
  expectNoTestCode,
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
const VERIFY_ERROR = '[data-testid="signup-verify-error"]';

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
    cy.get(`input[name="${box}"]`).type(value);
    signupNext().click();
    cy.contains(message).should('be.visible');
    onSignupStep(1);
  });
}

const verifyButton = () => cy.get('[data-testid="signup-verify"]');
const codeBox = () => cy.get('input[name="otp"]');
const interestChip = (index: number) => cy.get('.MuiChip-root[role="button"]').eq(index);
const findMyCrew = () => cy.contains('button', 'Find my crew');

describe('01 Sign up', () => {
  const account = runAccount();
  const phoneTarget = { phone: account.phone };

  describe('step 1 — who you are', () => {
    it('SU-01 signed out, /register opens on step 1 with Continue, Google and Log in', () => {
      openSignup();
      signupNext().should('contain.text', 'Continue');
      googleButton().should('exist');
      cy.contains('Already have an account?').should('be.visible');
      cy.get('[data-testid="go-login"]').should('contain.text', 'Log in').and('have.attr', 'href', '/login');
    });

    it('SU-02 Continue with step 1 empty asks for the name and the date of birth', () => {
      openSignup();
      signupNext().click();
      cy.contains('Name is required').should('be.visible');
      cy.contains('Date of birth is required').should('be.visible');
      onSignupStep(1);
    });

    itRefusesOnStepOne(STEP_ONE_REFUSALS.nameWithDigits);
    itRefusesOnStepOne(STEP_ONE_REFUSALS.oneLetterName);

    it('SU-05 a date of birth under the admin minimum age is refused', () => {
      minSignupAge().then((minAge) => {
        openSignup();
        fillWho(SIGNUP_NAME, underAgeDob(minAge));
        signupNext().click();
        cy.contains(dobMinAgeMessage(minAge)).should('be.visible');
        onSignupStep(1);
      });
    });

    itRefusesOnStepOne(STEP_ONE_REFUSALS.badReferralCode);

    it('SU-07 a referral link arrives with its code filled in', () => {
      openSignup(`/register?ref=${REFERRAL_CODE}`);
      cy.get('input[name="referralCode"]').should('have.value', REFERRAL_CODE);
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
      cy.contains('Phone number is required').should('be.visible');
      cy.contains('Email is required').should('be.visible');
    });

    it('SU-09 a WhatsApp number that is too short is refused', () => {
      cy.get('input[name="phoneNumber"]').type('12345');
      signupNext().click();
      cy.contains('Enter a phone number — digits only, 6 to 15').should('be.visible');
      onSignupStep(2);
    });

    it('SU-10 an incomplete email is refused', () => {
      cy.get('input[name="email"]').type('riya@');
      signupNext().click();
      cy.contains('Enter a valid email').should('be.visible');
      onSignupStep(2);
    });

    it('SU-11 Back from step 2 keeps the name, date of birth and referral code', () => {
      signupBack().click();
      onSignupStep(1);
      cy.get('input[name="name"]').should('have.value', SIGNUP_NAME);
      expectDob(ADULT_DOB);
      cy.get('input[name="referralCode"]').should('have.value', REFERRAL_CODE);
    });

    it('SU-12 a short password and a confirmation that differs are refused', () => {
      cy.get('input[name="referralCode"]').clear();
      signupNext().click();
      fillContact(account.phone, account.email);
      signupNext().should('be.enabled').click();
      fillSecurity('short', account.password('CHANGED'));
      signupNext().click();
      cy.contains('Min 8 characters').should('be.visible');
      cy.contains('Passwords do not match').should('be.visible');
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
        cy.contains('Accept every policy before creating your account').should('be.visible');
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
        policyDialog().find('input[type="checkbox"]').first().check();
        policyDialog().should('contain.text', `1 of ${total} accepted`);
        policyDialog().contains('button', 'Close').click();
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
        policyDialog().should('contain.text', `${reopenedWith} of ${total} accepted`);
        policyDialog().contains('button', 'Accept all').click();
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
      cy.contains(`We sent a 6-digit code to +91 ${account.phone} on WhatsApp.`).should('be.visible');
      expectNoTestCode();
    });

    it('SU-16 a wrong code is refused with the attempts left', () => {
      codeBox().type(wrongCode(signupCode));
      sendCode('VerifySignupWhatsAppOtp', () => {
        verifyButton().should('be.enabled').click();
      });
      cy.get(VERIFY_ERROR).should('contain.text', 'Incorrect code — 4 attempts left');
    });

    it('SU-17 Send again inside 30 seconds is refused', () => {
      sendCode('RequestSignupWhatsAppOtp', () => {
        cy.contains('button', 'Send again').click();
      });
      cy.get(VERIFY_ERROR).invoke('text').should('match', /^Wait \d+s before asking for another code$/);
    });

    it('SU-18 the code and Verify number create the account, save a token and open the survey', () => {
      codeBox().clear().type(signupCode);
      cy.interceptOperation('Register');
      verifyButton().should('contain.text', 'Verify number').click();
      cy.wait('@Register');
      cy.location('pathname').should('eq', '/signup-survey');
      savedToken().should('be.a', 'string').and('not.be.empty');
    });

    it('SU-19 the survey needs three interests, then lands on Home', () => {
      cy.contains("What's your vibe?").should('be.visible');
      cy.contains('Pick at least 3 interests across categories to find your tribe.').should('be.visible');
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
      cy.get('input[name="email"]').type(account.email);
      cy.contains('This email is already registered. Log in instead, or use a different email.').should('be.visible');
      signupNext().should('be.disabled');
      onSignupStep(2);
    });

    it('SU-22 its WhatsApp number is refused on step 2', () => {
      walkToContact(SIGNUP_NAME, ADULT_DOB);
      cy.get('input[name="phoneNumber"]').type(account.phone);
      cy.contains('This number is already registered. Log in instead, or use a different number.').should('be.visible');
      signupNext().should('be.disabled');
      onSignupStep(2);
    });
  });
});
