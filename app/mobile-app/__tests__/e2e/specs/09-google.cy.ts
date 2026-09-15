import { E2E_GOOGLE_CREDENTIAL_QUERY } from '@duncit/utils';
import { APP_TOKEN_KEY } from '../support/commands';
import {
  completeSurvey,
  expectDisabled,
  expectHome,
  expectLogin,
  fill,
  minSignupAge,
  pickDob,
  tap,
} from '../support/flows';
import { googleStandIn } from '../support/google-stand-in';
import { runAccount } from '../support/run-account';

/**
 * 09 · Google (GA): a second run account, `…-google@…`, joins through Google
 * with the run's WhatsApp number (freed by 08's purge) and signs in with Google
 * again. The popup is the stand-in in support/google-stand-in.ts, answering
 * with a credential this server minted for the address (`e2eGoogleCredential`);
 * everything after it is real. The purge in `after()` removes the account.
 *
 * Native web: src/components/GoogleAuthButton, the invite
 * (src/components/GoogleSignupInviteModal) on src/screens/LoginScreen, and the
 * Google door of src/screens/SignupScreen (the policies sheet, GoogleDetailsStep,
 * VerifyWhatsappStep), then ReferralPromptScreen and the survey.
 */

const SIGNUP_POLICIES = `query E2eSignupPolicies { signupPolicies { id } }`;

describe('Native · 09 google', () => {
  const account = runAccount();
  const googleEmail = account.address('google');
  let credential = '';

  before(() => {
    cy.staffGql<{ e2eGoogleCredential: string }>(E2E_GOOGLE_CREDENTIAL_QUERY, {
      email: googleEmail,
      given_name: 'Duncit',
      family_name: 'Google',
    }).then((data) => {
      credential = data.e2eGoogleCredential;
    });
  });

  after(() => {
    cy.purgeRunAccount();
  });

  /** A signed-out boot whose Google popup answers with the run's credential. */
  const openWithGoogle = (path: string): void => {
    cy.clearAuth();
    cy.visitApp(path, { onBeforeLoad: googleStandIn(credential) });
  };

  /** Continue with Google, once the button can open its popup. */
  const pressGoogle = (): void => {
    cy.byTestId('google-auth-button', { timeout: 30_000 }).should(($button) => {
      expect(
        $button.attr('aria-disabled'),
        'staging prerequisite: a Google client id (publicClientConfig), so Continue with Google is enabled',
      ).not.to.eq('true');
    });
    cy.byTestId('google-auth-button').click();
  };

  describe('no account yet', () => {
    it('GA-01 Google on /login for an address with no account offers to create one; Not now closes it', () => {
      openWithGoogle('/login');
      expectLogin();
      cy.interceptOperation('MobileLoginWithGoogle');
      pressGoogle();
      cy.wait('@MobileLoginWithGoogle');
      cy.byTestId('google-signup-invite')
        .should('be.visible')
        .and('contain', googleEmail.toLowerCase());
      cy.byTestId('google-signup-invite-title').should('have.text', 'No Duncit account yet');
      cy.byTestId('google-signup-dismiss').should('contain', 'Not now').click();
      cy.byTestId('google-signup-invite').should('not.exist');
      expectLogin();
      cy.byTestId('login-error').should('not.exist');
    });
  });

  // One continuous signup: the number and code steps only exist inside the page
  // that reached them, so these scenarios share the page rather than reloading.
  describe('the Google signup', { testIsolation: false }, () => {
    let issuedBefore = '';

    it('GA-02 Create one › Continue with Google asks for the policies, then for the number', () => {
      openWithGoogle('/login');
      tap('go-signup');
      cy.byTestId('signup-screen').should('exist');
      pressGoogle();
      cy.gql<{ signupPolicies: { id: string }[] }>(SIGNUP_POLICIES, {}, { token: null }).then(
        (data) => {
          if (data.signupPolicies.length === 0) {
            cy.log('No policy gates signup on this server, so there is nothing to accept.');
            return;
          }
          cy.byTestId('policy-acceptance-sheet').should('be.visible');
          tap('policy-acceptance-accept-all');
          cy.byTestId('policy-acceptance-sheet').should('not.exist');
        },
      );
      cy.byTestId('signup-number-continue').should('be.visible');
      cy.byTestId('google-auth-button').should('not.exist');
    });

    it('GA-03 the number, "also my mobile" and a birthday send the WhatsApp code', () => {
      expectDisabled('signup-number-continue');
      cy.byTestId('signup-phone-code-trigger').should('contain', '+91');
      cy.interceptOperation('MobileSignupContactAvailability');
      fill('field-phoneNumber', account.phone);
      cy.wait('@MobileSignupContactAvailability');
      cy.byTestId('signup-same-as-mobile').should('have.attr', 'aria-checked', 'true');
      minSignupAge().then((minAge) => {
        pickDob(new Date().getFullYear() - (minAge + 10), 15);
      });

      cy.lastOtpIssuedAt('WHATSAPP_SIGNUP', { phone: account.phone }).then((issuedAt) => {
        issuedBefore = issuedAt;
      });
      cy.interceptOperation('MobileRequestSignupWhatsAppOtp');
      tap('signup-number-continue');
      cy.wait('@MobileRequestSignupWhatsAppOtp');
      cy.byTestId('signup-screen').should(
        'contain',
        `We sent a 6-digit code to +91 ${account.phone} on WhatsApp.`,
      );
      cy.byTestId('signup-test-code').should('not.exist');
    });

    it('GA-04 the held code creates the Google account, and its referral question can be skipped', () => {
      cy.readOtp('WHATSAPP_SIGNUP', { phone: account.phone }, issuedBefore).then((code) => {
        fill('field-otp', code);
      });
      cy.interceptOperation('MobileVerifySignupWhatsAppOtp');
      cy.interceptOperation('MobileSignupWithGoogle');
      tap('signup-verify');
      cy.wait('@MobileVerifySignupWhatsAppOtp');
      cy.wait('@MobileSignupWithGoogle');
      cy.byTestId('referral-prompt-screen').should('exist');
      cy.window()
        .its('localStorage')
        .invoke('getItem', APP_TOKEN_KEY)
        .should('be.a', 'string')
        .and('not.be.empty');
      cy.byTestId('referral-prompt-skip').should('have.text', 'Skip for now').click();
      cy.byTestId('referral-prompt-screen').should('not.exist');
    });

    it('GA-05 three interests on the survey land on Home', () => {
      completeSurvey();
    });
  });

  describe('the account now exists', () => {
    it('GA-06 signed out, Continue with Google on /login signs straight in', () => {
      openWithGoogle('/login');
      expectLogin();
      cy.interceptOperation('MobileLoginWithGoogle');
      pressGoogle();
      cy.wait('@MobileLoginWithGoogle');
      expectHome();
    });
  });
});
