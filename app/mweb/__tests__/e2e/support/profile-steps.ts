/// <reference types="cypress" />
import type { ContactChannel } from '@duncit/utils';
import { fill, sendAndReadCode, sendCode } from './account-steps';

/**
 * Profile → Edit profile (`EditAccountDialog` + `AccountEditForm`) and the
 * contact-change dialog it opens, by the test ids the native twin uses: a box
 * is `field-<name>`, its line `<name>-error`, the sheet `edit-account-dialog`.
 */

export const saveButton = () => cy.byTestId('account-edit-submit');

/** /account, loaded: its header's Edit button is the sign the profile arrived. */
export function openAccount(): void {
  cy.visitApp('/account');
  cy.byTestId('account-screen').should('exist');
  cy.byTestId('account-edit').should('be.visible');
}

export function openEditProfile(): void {
  openAccount();
  cy.byTestId('account-edit').click();
  cy.byTestId('edit-account-dialog').should('be.visible').and('contain.text', 'Edit profile');
}

/** Save, wait for the server, and see the page say so. */
export function saveProfile(): void {
  sendCode('UpdateMyProfileFull', () => {
    saveButton().should('be.enabled').click();
  });
  cy.byTestId('profile-saved').should('contain.text', 'Profile updated');
}

/** Close the dialog the way a person does without a close button: tap outside it. */
export function tapOutsideEditDialog(): void {
  cy.byTestId('edit-account-dialog').click('topLeft');
}

/** An Autocomplete in the location block (`location-country`, `location-state`): type, then pick. */
export function pickOption(select: string, option: string): void {
  fill(`${select}-trigger`, option);
  cy.byTestId(`${select}-option-${option}`).click();
}

export function openContactChange(channel: ContactChannel): void {
  cy.byTestId(`contact-change-${channel}`).click();
  cy.byTestId('change-contact-sheet').should('be.visible');
}

/** Ask for an email change to `address` and yield the code sent to it. */
export function requestEmailChange(address: string): Cypress.Chainable<string> {
  openContactChange('EMAIL');
  fill('field-email', address);
  return sendAndReadCode('EMAIL_VERIFICATION', { email: address }, 'RequestEmailChangeOtp', () => {
    cy.byTestId('contact-change-send').should('be.enabled').click();
  });
}

export function confirmEmailCode(code: string): void {
  fill('field-otp', code);
  sendCode('ConfirmEmailChange', () => {
    cy.byTestId('contact-change-verify').should('be.enabled').click();
  });
}

/** The contact number is stored as typed — no code. */
export function savePhoneNumber(number: string): void {
  openContactChange('PHONE');
  fill('field-number', number);
  sendCode('SetContactPhoneNumber', () => {
    cy.byTestId('contact-change-send').should('contain.text', 'Save number').and('be.enabled').click();
  });
  cy.byTestId('change-contact-sheet').should('not.exist');
}
