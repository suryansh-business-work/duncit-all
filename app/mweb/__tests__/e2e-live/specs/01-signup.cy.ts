/// <reference types="cypress" />

import { derivedEmail, identity, unregisteredPhone } from '../support/identity';

/**
 * Join Duncit, against the real server.
 *
 * First in the run on purpose: the account this creates is the one the
 * onboarding spec applies to host with, and the one the sign-in spec recovers
 * a password for. It is the run's signup identity, so the purge at the end of
 * the leg removes it with everything that points at it.
 */

const NAME = 'Riya Duncit';

const next = () => cy.get('[data-testid="signup-next"]').click();
const onStep = (n: number) => cy.contains(`Step ${n} of 4`).should('exist');
const birthYear = () => String(new Date().getFullYear() - 25);

function fillWho(name: string) {
  onStep(1);
  cy.fieldByLabel('Name').clear().type(name);
  // A native <select>, chosen over MUI's popover on purpose (120 years).
  cy.get('select[name="dobYear"]').select(birthYear());
}

function fillContact(phone: string, email: string) {
  onStep(2);
  cy.get('input[name="phoneNumber"]').clear().type(phone);
  cy.get('input[name="email"]').clear().type(email);
}

/**
 * The policies box cannot be ticked directly: ticking opens the list, and
 * Accept all ticks every policy in one press. The box is not rendered at all
 * when the server has no policy to accept, so its absence is not a failure.
 */
function acceptPolicies() {
  cy.get('body').then(($body) => {
    if ($body.find('label:contains("I have read and accept the Duncit policies")').length === 0) return;
    cy.contains('label', 'I have read and accept the Duncit policies').click();
    cy.contains('[role="dialog"]', 'Policies you need to accept').within(() => {
      cy.contains('button', 'Accept all').click();
    });
  });
}

function fillSecurity(password: string) {
  onStep(3);
  cy.get('input[name="password"]').clear().type(password);
  cy.get('input[name="confirmPassword"]').clear().type(password);
  acceptPolicies();
}

/** Steps 1–3, then Create account — which opens step 4 and asks the server for the code. */
function walkToVerify(details: { phone: string; email: string; password: string }) {
  cy.visitApp('/register');
  fillWho(NAME);
  next();
  fillContact(details.phone, details.email);
  next();
  fillSecurity(details.password);
  cy.interceptOperation('RequestSignupWhatsAppOtp');
  next();
  cy.wait('@RequestSignupWhatsAppOtp');
  onStep(4);
}

describe('Sign up', () => {
  const me = identity();

  beforeEach(() => {
    cy.blockThirdParty();
    cy.clearAuth();
  });

  it('step 1 refuses an empty name, a name with digits and a bad referral code', () => {
    cy.visitApp('/register');
    onStep(1);
    next();
    cy.contains('Name is required').should('be.visible');
    cy.contains('Birth year is required').should('be.visible');

    cy.fieldByLabel('Name').type('R2D2');
    cy.fieldByLabel('Referral code (optional)').type('abc');
    next();
    cy.contains('Name can use letters, spaces, apostrophes and periods only').should('be.visible');
    cy.contains('Enter a code like DUN-XXXXXX').should('be.visible');
    onStep(1);
  });

  it('step 2 refuses a bad WhatsApp number and a bad email', () => {
    cy.visitApp('/register');
    fillWho(NAME);
    next();
    onStep(2);
    next();
    cy.contains('Phone number is required').should('be.visible');
    cy.contains('Email is required').should('be.visible');

    cy.get('input[name="phoneNumber"]').type('123');
    cy.get('input[name="email"]').type('not-an-email');
    next();
    cy.contains('Enter a phone number — digits only, 6 to 15').should('be.visible');
    cy.contains('Enter a valid email').should('be.visible');
    onStep(2);
  });

  it('step 3 refuses a short password and a confirmation that does not match', () => {
    cy.visitApp('/register');
    fillWho(NAME);
    next();
    fillContact(me.phone, me.signupEmail);
    next();
    onStep(3);
    cy.get('input[name="password"]').type('short');
    cy.get('input[name="confirmPassword"]').type('different1');
    next();
    cy.contains('Min 8 characters').should('be.visible');
    cy.contains('Passwords do not match').should('be.visible');
    onStep(3);
  });

  it('will not create the account until every policy is accepted', () => {
    cy.visitApp('/register');
    fillWho(NAME);
    next();
    fillContact(me.phone, me.signupEmail);
    next();
    onStep(3);
    cy.get('input[name="password"]').type(me.password);
    cy.get('input[name="confirmPassword"]').type(me.password);
    cy.get('body').then(($body) => {
      // No policies configured means nothing to accept — the rule has no case to refuse.
      if ($body.find('label:contains("I have read and accept the Duncit policies")').length === 0) return;
      next();
      cy.contains('Accept every policy before creating your account').should('be.visible');
      onStep(3);
    });
  });

  it('goes back a step with what was typed still there', () => {
    cy.visitApp('/register');
    fillWho(NAME);
    next();
    onStep(2);
    cy.get('[data-testid="signup-back"]').click();
    onStep(1);
    cy.fieldByLabel('Name').should('have.value', NAME);
    cy.get('select[name="dobYear"]').should('have.value', birthYear());
  });

  it('walks all four steps, proves the WhatsApp number with the test code and creates the account', () => {
    walkToVerify({ phone: me.phone, email: me.signupEmail, password: me.password });
    cy.contains('We sent a 6-digit code to').should('be.visible');

    // With "Return one-time codes" on, the server hands the code back and the
    // screen prints it — this is the only way a suite can finish a signup.
    cy.readTestCode().then((code) => {
      cy.get('input[name="otp"]').type(code);
    });
    cy.interceptOperation('Register');
    cy.get('[data-testid="signup-verify"]').click();
    cy.wait('@Register').its('response.statusCode').should('eq', 200);

    // A new account is asked for its interests before it sees the feed.
    cy.location('pathname').should('eq', '/signup-survey');
    cy.contains("What's your vibe?").should('be.visible');
    cy.contains('button', 'Find my crew').should('be.disabled');
    cy.get('.MuiChip-root[role="button"]').eq(0).click();
    cy.get('.MuiChip-root[role="button"]').eq(1).click();
    cy.get('.MuiChip-root[role="button"]').eq(2).click();
    cy.interceptOperation('SaveInterests');
    cy.contains('button', 'Find my crew').should('be.enabled').click();
    cy.wait('@SaveInterests');
    cy.location('pathname').should('eq', '/');
  });

  it('refuses a second account on the same email address', () => {
    walkToVerify({ phone: unregisteredPhone(), email: me.signupEmail, password: me.password });
    cy.contains('Email already in use').should('be.visible');
  });

  it('refuses a second account on the same WhatsApp number', () => {
    walkToVerify({ phone: me.phone, email: derivedEmail('dup'), password: me.password });
    cy.contains('This phone number is already registered. Please use a different number or login.').should(
      'be.visible',
    );
  });
});
