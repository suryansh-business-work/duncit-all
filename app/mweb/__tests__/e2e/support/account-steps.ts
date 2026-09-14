/// <reference types="cypress" />
import type { E2eCodePurpose } from '@duncit/utils';
import type { CodeTarget } from './commands';

/**
 * Steps the account specs share: signing in, asking for a one-time code and
 * reading back the one the server issued, and the refusals several flows end
 * on. Selectors and copy are the ones the mWeb components render today.
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

/** MUI's dialog paper. */
export const DIALOG = '[role="dialog"]';

/** The dialog that shows this text. */
export const dialogWith = (text: string | RegExp) => cy.contains(DIALOG, text);

/** What `me` answers for a token — null once the server no longer honours it. */
export const sessionUser = (token: string) => cy.gql<SessionUser>(SESSION_USER_QUERY, {}, { token });

/** The token the app saved after a sign-in. */
export const savedToken = () => cy.window().its('localStorage').invoke('getItem', 'token');

/** A screen that sent a code must never print it. */
export function expectNoTestCode(): void {
  cy.contains(/Test code/).should('not.exist');
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

export const openPasswordStep = () => cy.get('[data-testid="continue-with-password"]').click();
export const openOtpStep = () => cy.get('[data-testid="continue-with-otp"]').click();

/** The Email | Phone switch on the sign-in and code steps. */
export const channelTab = (name: 'Email' | 'Phone') => cy.contains('[role="tab"]', name);

/** Signed out, on the page that holds the flow. */
export function openSignedOut(path: string): void {
  cy.clearAuth();
  cy.visitApp(path);
}

/** Signed out, submit an email and password on the password step and wait for the server. */
export function signInWithPassword(email: string, password: string, path = '/login'): void {
  openSignedOut(path);
  openPasswordStep();
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password, { log: false });
  cy.interceptOperation('Login');
  cy.contains('button', 'Log me in').click();
  cy.wait('@Login');
}

/** The one refusal a wrong password, an unknown address and a sealed account share. */
export const PASSWORD_REFUSED = 'Invalid email or password';

/** Both code flows refuse an address with no account with this, beside a Create Account link. */
export const NO_ACCOUNT = 'We couldn’t find an account with these details.';

/** On a code flow's channel step, type the address and send (sign-in code or reset code). */
export function sendCodeToEmail(email: string, operation: string): void {
  cy.get('input[name="email"]').clear().type(email);
  sendCode(operation, () => {
    cy.contains('button', 'Send code').should('be.enabled').click();
  });
}
