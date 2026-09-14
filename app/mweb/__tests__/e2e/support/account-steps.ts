/// <reference types="cypress" />
import type { E2eCodePurpose } from '@duncit/utils';
import type { CodeTarget } from './commands';

/**
 * Steps the account specs share: signing in, asking for a one-time code and
 * reading back the one the server issued, and the refusals several flows end
 * on. Every element is found by its `data-testid` — the same names the native
 * twin's testIDs carry — and copy is asserted ON that element.
 */

/** The server's resend cooldown (`OTP_RESEND_COOLDOWN_SEC`, 30 s) plus a second of margin. */
const RESEND_COOLDOWN_MS = 31_000;

const SESSION_USER_QUERY = `query E2eSessionUser {
  me { user_id email }
}`;

export type SessionUser = { me: { user_id: string; email: string } | null };

/** Any six digits other than the real code: every digit moved on by one. */
export const wrongCode = (code: string): string =>
  code.replaceAll(/\d/g, (digit) => String((Number(digit) + 1) % 10));

/** What `me` answers for a token — null once the server no longer honours it. */
export const sessionUser = (token: string) => cy.gql<SessionUser>(SESSION_USER_QUERY, {}, { token });

/** The token the app saved after a sign-in. */
export const savedToken = () => cy.window().its('localStorage').invoke('getItem', 'token');

/** A screen that sent a code must never print it (`recovery-test-code`, `signup-test-code`). */
export function expectNoTestCode(testId: string): void {
  cy.byTestId(testId).should('not.exist');
}

/** Press whatever sends a code, and wait for the server to answer the send. */
export function sendCode(operation: string, press: () => void): void {
  cy.interceptOperation(operation);
  press();
  cy.wait(`@${operation}`);
}

/**
 * The same send, yielding the code the server issued for it. The newest held
 * code is read BEFORE the send, so an older one can never be mistaken for it.
 */
export function sendAndReadCode(
  purpose: E2eCodePurpose,
  target: CodeTarget,
  operation: string,
  press: () => void,
): Cypress.Chainable<string> {
  return cy.lastOtpIssuedAt(purpose, target).then((before) => {
    sendCode(operation, press);
    return cy.readOtp(purpose, target, before);
  });
}

/** Wait out what is left of the resend cooldown since `sentAt` (a `Date.now()`). */
export function waitOutResendCooldown(sentAt: number): void {
  cy.then(() => {
    cy.wait(Math.max(0, RESEND_COOLDOWN_MS - (Date.now() - sentAt)));
  });
}

/** Replace what a box holds with `text`. */
export function fill(testId: string, text: string, options: Partial<Cypress.TypeOptions> = {}): void {
  cy.byTestId(testId).clear();
  cy.byTestId(testId).type(text, options);
}

export const openPasswordStep = () => cy.byTestId('continue-with-password').click();
export const openOtpStep = () => cy.byTestId('continue-with-otp').click();

/** Signed out, on the page that holds the flow. */
export function openSignedOut(path: string): void {
  cy.clearAuth();
  cy.visitApp(path);
}

/** Signed out, submit an email and password on the password step and wait for the server. */
export function signInWithPassword(email: string, password: string, path = '/login'): void {
  openSignedOut(path);
  openPasswordStep();
  cy.byTestId('field-email').type(email);
  cy.byTestId('field-password').type(password, { log: false });
  cy.interceptOperation('Login');
  cy.byTestId('login-submit').click();
  cy.wait('@Login');
}

/** The one refusal a wrong password, an unknown address and a sealed account share. */
export function expectPasswordRefused(): void {
  cy.byTestId('login-error').should('contain.text', 'Invalid email or password');
  cy.location('pathname').should('eq', '/login');
}

/** Both code flows refuse an address with no account with this, beside Create Account. */
export function expectNoAccount(): void {
  cy.byTestId('recovery-not-found').should('have.text', 'We couldn’t find an account with these details.');
  cy.byTestId('recovery-create-account')
    .should('contain.text', 'Create Account')
    .and('have.attr', 'href', '/register');
}

/** Press Send code on a channel step (sign-in code or reset code) and wait for the server. */
export function pressSendCode(): void {
  cy.byTestId('recovery-send-code').should('be.enabled').click();
}

/** On a code flow's channel step, type the address and send. */
export function sendCodeToEmail(email: string, operation: string): void {
  fill('field-email', email);
  sendCode(operation, pressSendCode);
}
