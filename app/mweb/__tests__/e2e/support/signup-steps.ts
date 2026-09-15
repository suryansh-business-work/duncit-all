/// <reference types="cypress" />
import { fill, openSignedOut, sendCode } from './account-steps';
import { typeDob, type Dob } from './dob';

/**
 * The four signup steps on /register (`RegisterForm` + `VerifyWhatsappStep`),
 * by the native twin's test ids. "Step X of 4" is the progress bar's accessible
 * name, not a caption.
 */

export const SIGNUP_NAME = 'Riya Duncit';

const SIGNUP_POLICIES_QUERY = `query E2eSignupPolicies {
  signupPolicies { id }
}`;

export const signupNext = () => cy.byTestId('signup-next');
export const signupBack = () => cy.byTestId('signup-back');

export const onSignupStep = (n: number) =>
  cy.byTestId('step-progress-bar').should('have.attr', 'aria-label', `Step ${n} of 4`);

export function openSignup(path = '/register'): void {
  openSignedOut(path);
  onSignupStep(1);
}

/** Step 1. An empty referral code leaves the box untouched. */
export function fillWho(name: string, dob: Dob, referralCode = ''): void {
  fill('field-name', name);
  typeDob(dob);
  if (referralCode) fill('field-referralCode', referralCode);
}

/**
 * "This is also my mobile number" — ticked unless the person says otherwise, and
 * the only thing that files the number as the profile phone (which a callback
 * request and an SOS call back on). Every signup walk leaves it ticked.
 */
export const expectSameAsMobile = () => cy.byTestId('signup-same-as-mobile-input').should('be.checked');

/** Step 2. Both boxes ask the server as they are typed; Continue waits for the answers. */
export function fillContact(phone: string, email: string): void {
  onSignupStep(2);
  fill('field-phoneNumber', phone);
  expectSameAsMobile();
  fill('field-email', email);
}

/** Step 3's two password boxes. */
export function fillSecurity(password: string, confirmation = password): void {
  onSignupStep(3);
  fill('field-password', password, { log: false });
  fill('field-confirmPassword', confirmation, { log: false });
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

export const policyBox = () => cy.byTestId('signup-policies-checkbox');
export const policyCheckbox = () => cy.byTestId('signup-policies-checkbox-input');
export const policyDialog = () => cy.byTestId('policy-acceptance-sheet');

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
    cy.byTestId('policy-acceptance-accept-all').click();
    policyCheckbox().should('be.checked');
  });
}

/** Google renders its own button once the client id is known. */
export const googleButton = () => cy.byTestId('google-auth-button', { timeout: 30_000 });

const interestChip = (index: number) => cy.byTestIdPrefix('chip-').eq(index);
const findMyCrew = () => cy.byTestId('survey-submit');

/** The interests survey every new account meets: three picks, then Home. */
export function finishInterestSurvey(): void {
  cy.location('pathname').should('eq', '/signup-survey');
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
}
