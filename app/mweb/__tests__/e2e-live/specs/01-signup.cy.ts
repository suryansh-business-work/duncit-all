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
/** Decades clear of any minimum joining age. No leading zeros, so each part completes on its last digit. */
const DOB = { Day: '15', Month: '8', Year: '1995' } as const;
type DobPart = keyof typeof DOB;
const DOB_PARTS: readonly DobPart[] = ['Day', 'Month', 'Year'];

const next = () => cy.get('[data-testid="signup-next"]').click();
/** "Step X of N" is the progress bar's accessible name, not a caption. */
const onStep = (n: number) =>
  cy.get('[data-testid="signup-stepper"] [role="progressbar"]').should('have.attr', 'aria-label', `Step ${n} of 4`);

/**
 * One part of the date-of-birth box. MUI X renders the field as a contenteditable
 * `role="spinbutton"` per part, named Day / Month / Year, beside a hidden input.
 */
const dobPart = (part: DobPart) =>
  cy.contains('label', 'Date of birth').parent().find(`[role="spinbutton"][aria-label="${part}"]`);

/**
 * Typed part by part, addressed by name rather than position: the order and the
 * separators come from the admin's date format, so "DD MM YYYY" today may be
 * "MM/DD/YYYY" tomorrow. Each part is checked as it lands.
 */
function typeDob() {
  DOB_PARTS.forEach((part) => {
    dobPart(part).type(DOB[part]).should('have.attr', 'aria-valuenow', DOB[part]);
  });
}

function fillWho(name: string) {
  onStep(1);
  cy.fieldByLabel('Name').clear().type(name);
  typeDob();
}

/**
 * Both boxes ask the server as they are typed, and Continue stays disabled
 * until the answers are back — `next()` waits for it to enable.
 */
function fillContact(phone: string, email: string) {
  onStep(2);
  cy.get('input[name="phoneNumber"]').clear().type(phone);
  cy.get('input[name="email"]').clear().type(email);
}

/** Steps 1 and 2 filled in, still on step 2 — where a taken contact is refused. */
function walkToContact(phone: string, email: string) {
  cy.visitApp('/register');
  fillWho(NAME);
  next();
  fillContact(phone, email);
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
  walkToContact(details.phone, details.email);
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
    cy.contains('Date of birth is required').should('be.visible');

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
    DOB_PARTS.forEach((part) => {
      dobPart(part).should('have.attr', 'aria-valuenow', DOB[part]);
    });
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

  // A taken contact is a correction beside its box on step 2, before any code is sent.
  it('refuses a second account on the same email address', () => {
    walkToContact(unregisteredPhone(), me.signupEmail);
    cy.contains('This email is already registered. Log in instead, or use a different email.').should('be.visible');
    cy.get('[data-testid="signup-next"]').should('be.disabled');
    onStep(2);
  });

  it('refuses a second account on the same WhatsApp number', () => {
    walkToContact(me.phone, derivedEmail('dup'));
    cy.contains('This number is already registered. Log in instead, or use a different number.').should('be.visible');
    cy.get('[data-testid="signup-next"]').should('be.disabled');
    onStep(2);
  });
});
