/// <reference types="cypress" />
import type { ContactChannel } from '@duncit/utils';
import { dialogWith, sendAndReadCode, sendCode } from './account-steps';

/**
 * Profile → Edit profile (`EditAccountDialog` + `AccountEditForm`) and the
 * contact-change dialog it opens. Every box is a react-hook-form field, so the
 * inputs carry their field name.
 */

export const editDialog = () => dialogWith('Edit profile');
export const saveButton = () => editDialog().contains('button', /^Save$/);
export const formBox = (name: string) => editDialog().find(`[name="${name}"]`);

/** /account, loaded: its header's Edit button is the sign the profile arrived. */
export function openAccount(): void {
  cy.visitApp('/account');
  cy.contains('button', /^Edit$/).should('be.visible');
}

export function openEditProfile(): void {
  openAccount();
  cy.contains('button', /^Edit$/).click();
  editDialog().should('be.visible');
}

/** Save, wait for the server, and see the page say so. */
export function saveProfile(): void {
  sendCode('UpdateMyProfileFull', () => {
    saveButton().should('be.enabled').click();
  });
  cy.contains('Profile updated').should('be.visible');
}

/** Close the dialog the way a person does without a close button: tap outside it. */
export function tapOutsideEditDialog(): void {
  editDialog().parent('.MuiDialog-container').click('topLeft');
}

/** An Autocomplete in the location block: type, then pick the exact option. */
export function pickOption(label: string, option: string): void {
  cy.fieldByLabel(label).clear().type(option);
  cy.contains('[role="option"]', new RegExp(`^${option}$`)).click();
}

const CHANGE_TITLES: Readonly<Record<ContactChannel, string>> = {
  EMAIL: 'Change email address',
  PHONE: 'Change phone number',
  WHATSAPP: 'Change WhatsApp number',
};

export const contactDialog = (channel: ContactChannel) => dialogWith(CHANGE_TITLES[channel]);

export function openContactChange(channel: ContactChannel): void {
  cy.get(`[data-testid="contact-change-${channel}"]`).click();
  contactDialog(channel).should('be.visible');
}

/** Ask for an email change to `address` and yield the code sent to it. */
export function requestEmailChange(address: string): Cypress.Chainable<string> {
  openContactChange('EMAIL');
  contactDialog('EMAIL').find('input[name="email"]').clear().type(address);
  return sendAndReadCode('EMAIL_VERIFICATION', { email: address }, 'RequestEmailChangeOtp', () => {
    contactDialog('EMAIL').contains('button', 'Send code').should('be.enabled').click();
  });
}

export function confirmEmailCode(code: string): void {
  contactDialog('EMAIL').find('input[name="otp"]').clear().type(code);
  sendCode('ConfirmEmailChange', () => {
    contactDialog('EMAIL').contains('button', 'Verify and save').should('be.enabled').click();
  });
}

/** The contact number is stored as typed — no code. */
export function savePhoneNumber(number: string): void {
  openContactChange('PHONE');
  contactDialog('PHONE').find('input[name="number"]').clear().type(number);
  sendCode('SetContactPhoneNumber', () => {
    contactDialog('PHONE').contains('button', 'Save number').should('be.enabled').click();
  });
  contactDialog('PHONE').should('not.exist');
}
