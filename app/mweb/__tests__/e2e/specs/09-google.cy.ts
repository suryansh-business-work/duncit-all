/// <reference types="cypress" />
import {
  expectNoTestCode,
  fill,
  openSignedOut,
  savedToken,
  sendAndReadCode,
  sendCode,
  sessionUser,
} from '../support/account-steps';
import { ADULT_DOB, typeDob } from '../support/dob';
import {
  expectGoogleConfigured,
  handGoogleCredential,
  mintGoogleCredential,
  pressGoogle,
  standInForGoogle,
} from '../support/google-stand-in';
import { runAccount } from '../support/run-account';
import {
  expectSameAsMobile,
  finishInterestSurvey,
  logNoPolicies,
  onSignupStep,
  policyDialog,
  signupPolicyCount,
} from '../support/signup-steps';

/**
 * 09 — Join and sign in with Google, live. Runs after 08 has purged the
 * password account, so the run's WhatsApp number is free again.
 *
 * A second account, `…-google@…`, with the same number: Google's popup is
 * stood in for (support/google-stand-in.ts), and everything after it is real —
 * the server's check of the credential, the policies, the number and date of
 * birth Google does not share, the WhatsApp code, the referral question, the
 * interests. GA-03..GA-06 are one signup on one page, in order; GA-07 signs the
 * new account back in. `after()` purges it.
 */

const sendCodeButton = () => cy.byTestId('signup-number-continue');

describe('09 Google sign-up and sign-in', () => {
  const account = runAccount();
  const googleEmail = account.address('google');
  const phoneTarget = { phone: account.phone };

  /** Signed out on /login with Google stood in and the credential handed over. */
  function openLoginWithGoogle(): void {
    mintGoogleCredential(googleEmail).then((credential) => {
      standInForGoogle();
      openSignedOut('/login');
      handGoogleCredential(credential);
    });
  }

  /** /login › Create one › /register, with Google stood in and the credential handed over. */
  function openSignupWithGoogle(): void {
    mintGoogleCredential(googleEmail).then((credential) => {
      standInForGoogle();
      openSignedOut('/login');
      cy.byTestId('go-signup').should('have.text', 'Create one').click();
      cy.location('pathname').should('eq', '/register');
      onSignupStep(1);
      handGoogleCredential(credential);
    });
  }

  before(() => {
    expectGoogleConfigured();
  });

  after(() => {
    cy.purgeRunAccount();
  });

  it('GA-01 Google on /login with no Duncit account offers to create one, and Not now closes the offer', () => {
    openLoginWithGoogle();
    sendCode('LoginWithGoogle', pressGoogle);
    cy.byTestId('google-signup-invite-title').should('have.text', 'No Duncit account yet');
    cy.byTestId('google-signup-invite').should(
      'contain.text',
      `We could not find a Duncit account for ${googleEmail.toLowerCase()}.`,
    );
    cy.byTestId('google-signup-dismiss').should('have.text', 'Not now').click();
    cy.byTestId('google-signup-invite').should('not.exist');
    cy.location('pathname').should('eq', '/login');
    savedToken().should('be.null');
  });

  it('GA-02 Google on /register, then closing the policies unaccepted, creates nothing', () => {
    signupPolicyCount().then((total) => {
      if (total === 0) {
        logNoPolicies();
        return;
      }
      openSignupWithGoogle();
      pressGoogle();
      policyDialog().should('be.visible');
      cy.byTestId('policy-acceptance-close').click();
      policyDialog().should('not.exist');
      cy.byTestId('google-signup-error').should('have.text', 'Accept every policy to continue.');
      onSignupStep(1);
      savedToken().should('be.null');
    });
  });

  // One signup, one page: each scenario picks up the step the last one left.
  describe('creating the Google account', { testIsolation: false }, () => {
    let signupCode = '';

    it('GA-03 Accept all opens the number step, where Send code waits for a whole number and a date of birth', () => {
      openSignupWithGoogle();
      pressGoogle();
      cy.byTestId('policy-acceptance-accept-all').should('be.enabled').click();
      policyDialog().should('not.exist');
      sendCodeButton().should('have.text', 'Send code').and('be.disabled');
      cy.byTestId('field-phoneNumber').type('12345');
      cy.byTestId('phoneNumber-error').should('have.text', 'Enter a phone number — digits only, 6 to 15');
      sendCodeButton().should('be.disabled');
    });

    it('GA-04 the WhatsApp number, left ticked as the mobile number, and a date of birth send the code', () => {
      cy.interceptOperation('SignupContactAvailability');
      fill('field-phoneNumber', account.phone);
      cy.wait('@SignupContactAvailability');
      expectSameAsMobile();
      typeDob(ADULT_DOB);
      sendAndReadCode('WHATSAPP_SIGNUP', phoneTarget, 'RequestSignupWhatsAppOtp', () => {
        sendCodeButton().should('be.enabled').click();
      }).then((code) => {
        signupCode = code;
      });
      cy.byTestId('signup-screen').should(
        'contain.text',
        `We sent a 6-digit code to +91 ${account.phone} on WhatsApp.`,
      );
      expectNoTestCode('signup-test-code');
    });

    it('GA-05 the code creates the account, saves a token and asks for a referral code', () => {
      fill('field-otp', signupCode);
      cy.interceptOperation('SignupWithGoogle');
      sendCode('VerifySignupWhatsAppOtp', () => {
        cy.byTestId('signup-verify').should('be.enabled').click();
      });
      cy.wait('@SignupWithGoogle');
      cy.location('pathname').should('eq', '/signup-referral');
      savedToken().should('be.a', 'string').and('not.be.empty').then((token) => {
        sessionUser(String(token)).its('me.email').should('eq', googleEmail.toLowerCase());
      });
    });

    it('GA-06 Skip for now goes to the interests survey, which lands on Home', () => {
      cy.byTestId('signup-referral-skip-button').should('have.text', 'Skip for now').click();
      finishInterestSurvey();
    });
  });

  it('GA-07 signed out, Google on /login signs the new account in and lands on Home', () => {
    openLoginWithGoogle();
    sendCode('LoginWithGoogle', pressGoogle);
    cy.location('pathname').should('eq', '/');
    cy.byTestId('google-signup-invite').should('not.exist');
    savedToken().should('be.a', 'string').and('not.be.empty').then((token) => {
      sessionUser(String(token)).its('me.email').should('eq', googleEmail.toLowerCase());
    });
  });
});
