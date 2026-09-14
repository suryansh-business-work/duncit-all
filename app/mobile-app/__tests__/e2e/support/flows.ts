import { APP_TOKEN_KEY } from './commands';

/**
 * The few screen moves more than one spec makes, written once.
 *
 * Selectors are the app's own testIDs (react-native-web renders `testID` as
 * `data-testid`): a form box is `field-<name>` and its error line
 * `<name>-error` (src/components/FormTextField + Field). Every wait is on the
 * operation the app really sends (src/graphql/*.ts), never on a clock.
 */

/** Press a control by its testID once it accepts input. */
export function tap(testId: string): void {
  cy.byTestId(testId).should('not.have.attr', 'aria-disabled', 'true').click();
}

export function expectDisabled(testId: string): void {
  cy.byTestId(testId).should('have.attr', 'aria-disabled', 'true');
}

export function expectEnabled(testId: string): void {
  cy.byTestId(testId).should('not.have.attr', 'aria-disabled', 'true');
}

/** Replace what a box holds with `text`. */
export function fill(testId: string, text: string): void {
  cy.byTestId(testId).clear();
  cy.byTestId(testId).type(text, { delay: 0 });
}

/** Signed in and on Home, with the session the app will reuse saved. */
export function expectHome(): void {
  cy.byTestId('home-screen').should('exist');
  cy.location('pathname').should('eq', '/');
  cy.window().its('localStorage').invoke('getItem', APP_TOKEN_KEY).should('be.a', 'string');
}

/** Signed out, on the sign-in chooser. */
export function expectLogin(): void {
  cy.byTestId('login-screen').should('exist');
  cy.location('pathname').should('eq', '/login');
}

/** A six-digit code that is certainly not `code`. */
export const wrongCode = (code: string): string =>
  code.replace(/^\d/, (digit) => String((Number(digit) + 1) % 10));

const MIN_AGE_QUERY = `query MinSignupAge { publicAppSettings { min_signup_age } }`;

/** The admin's minimum joining age (Admin > Settings), as the app reads it. */
export const minSignupAge = (): Cypress.Chainable<number> =>
  cy
    .gql<{ publicAppSettings: { min_signup_age: number } }>(MIN_AGE_QUERY, {}, { token: null })
    .then((data) => data.publicAppSettings.min_signup_age);

/** Today, `years` years ago — a birthday that makes somebody exactly that old today. */
export function yearsAgo(years: number): Date {
  const today = new Date();
  return new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * A date written the way the date box asks for it. The box's placeholder is
 * the admin's pattern in typeable form (`DD MM YYYY`, `MM/DD/YYYY`, …), so the
 * digits go where its tokens are.
 */
function typedDate(placeholder: string, date: Date): string {
  const parts: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: pad(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    DD: pad(date.getDate()),
    D: String(date.getDate()),
  };
  return placeholder.replaceAll(/YYYY|YY|MM|M|DD|D/g, (token) => parts[token] ?? token);
}

/** Type a date of birth into the date box (src/forms/account-edit/DobDateField.tsx). */
export function typeDob(date: Date): void {
  cy.fieldByLabel('Date of birth').clear();
  cy.fieldByLabel('Date of birth')
    .invoke('attr', 'placeholder')
    .then((placeholder) => {
      cy.fieldByLabel('Date of birth').type(typedDate(String(placeholder), date), { delay: 0 });
    });
}

/** Pick a date of birth on the calendar sheet: the year, then a day of the month it opens on. */
export function pickDob(year: number, day: number): void {
  tap('dob-open');
  cy.byTestId('dob-sheet').should('be.visible');
  cy.byTestId('dob-year-search').type(String(year), { delay: 0 });
  tap(`dob-year-${year}`);
  tap(`dob-day-${day}`);
  tap('dob-done');
  cy.byTestId('dob-sheet').should('not.exist');
}

/** Open the password sign-in step from a signed-out boot. */
export function openPasswordSignIn(): void {
  cy.clearAuth();
  cy.visitApp('/login');
  tap('continue-with-password');
  cy.byTestId('login-submit').should('be.visible');
}

/** Sign in with an email and password, and wait for the server's answer. */
export function passwordSignIn(email: string, password: string): void {
  openPasswordSignIn();
  fill('field-email', email);
  fill('field-password', password);
  cy.interceptOperation('MobileLogin');
  tap('login-submit');
  cy.wait('@MobileLogin');
}

/** Open Continue with OTP from a signed-out boot. */
export function openOtpSignIn(): void {
  cy.clearAuth();
  cy.visitApp('/login');
  tap('continue-with-otp');
  cy.byTestId('recovery-send-code').should('be.visible');
}

/** Press Send code on a recovery-style channel step and wait for the server's answer. */
export function sendCode(operation: string): void {
  cy.interceptOperation(operation);
  tap('recovery-send-code');
  cy.wait(`@${operation}`);
}

/** Profile Settings, signed in with the token `cy.apiLogin` kept. */
export function openAccount(): void {
  cy.visitApp('/account');
  cy.byTestId('account-screen').should('exist');
}

/** The Edit profile sheet over Profile Settings. */
export function openEditProfile(): void {
  tap('account-edit');
  cy.byTestId('edit-account-dialog').should('be.visible').and('contain', 'Edit profile');
}

/** Save the Edit profile sheet and wait for the profile write. */
export function saveProfile(): void {
  cy.interceptOperation('MobileUpdateMyProfile');
  tap('account-edit-submit');
  cy.wait('@MobileUpdateMyProfile');
  cy.byTestId('edit-account-dialog').should('not.exist');
}
