/// <reference types="cypress" />
import { dialogWith, openSignedOut } from './account-steps';
import { typeDob, type Dob } from './dob';

/**
 * The four signup steps on /register (`RegisterForm` + `VerifyWhatsappStep`).
 * "Step X of 4" is the progress bar's accessible name, not a caption.
 */

export const SIGNUP_NAME = 'Riya Duncit';

const POLICY_BOX = 'I have read and accept the Duncit policies';

const SIGNUP_POLICIES_QUERY = `query E2eSignupPolicies {
  signupPolicies { id }
}`;

export const signupNext = () => cy.get('[data-testid="signup-next"]');
export const signupBack = () => cy.get('[data-testid="signup-back"]');

export const onSignupStep = (n: number) =>
  cy.get('[data-testid="signup-stepper"] [role="progressbar"]').should('have.attr', 'aria-label', `Step ${n} of 4`);

export function openSignup(path = '/register'): void {
  openSignedOut(path);
  onSignupStep(1);
}

/** Step 1. An empty referral code leaves the box untouched. */
export function fillWho(name: string, dob: Dob, referralCode = ''): void {
  cy.get('input[name="name"]').clear().type(name);
  typeDob(dob);
  if (referralCode) cy.get('input[name="referralCode"]').clear().type(referralCode);
}

/** Step 2. Both boxes ask the server as they are typed; Continue waits for the answers. */
export function fillContact(phone: string, email: string): void {
  onSignupStep(2);
  cy.get('input[name="phoneNumber"]').clear().type(phone);
  cy.get('input[name="email"]').clear().type(email);
}

/** Step 3's two password boxes. */
export function fillSecurity(password: string, confirmation = password): void {
  onSignupStep(3);
  cy.get('input[name="password"]').clear().type(password, { log: false });
  cy.get('input[name="confirmPassword"]').clear().type(confirmation, { log: false });
}

/** Steps 1 and 2 filled in by the caller's values, left on step 2. */
export function walkToContact(name: string, dob: Dob): void {
  openSignup();
  fillWho(name, dob);
  signupNext().click();
  onSignupStep(2);
}

/** How many policies gate signup on this server — none means the box is not rendered at all. */
export const signupPolicyCount = () =>
  cy
    .gql<{ signupPolicies: Array<{ id: string }> }>(SIGNUP_POLICIES_QUERY, {}, { token: null })
    .then((data) => data.signupPolicies.length);

export const policyBox = () => cy.contains('label', POLICY_BOX);
export const policyCheckbox = () => policyBox().find('input[type="checkbox"]');
export const policyDialog = () => dialogWith('Policies you need to accept');

export function logNoPolicies(): void {
  cy.log('No policy gates signup on this server, so there is nothing to accept.');
}

/** Tick the policies box and accept every policy, when the server has any. */
export function acceptAllPolicies(): void {
  signupPolicyCount().then((count) => {
    if (count === 0) {
      logNoPolicies();
      return;
    }
    policyBox().click();
    policyDialog().contains('button', 'Accept all').click();
    policyCheckbox().should('be.checked');
  });
}

/** Google renders its own button in an iframe once the client id is known. */
export const googleButton = () => cy.get('iframe[src*="accounts.google.com/gsi/button"]', { timeout: 30_000 });
