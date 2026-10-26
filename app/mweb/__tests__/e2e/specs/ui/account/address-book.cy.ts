/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { fill, sendCode } from '../../../support/account-steps';
import { signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';

/**
 * Address book (/address-book), live on staging, on the run account's own
 * addresses. The one address made here carries the run marker in its label and
 * is deleted by the last scenario; `before` clears any the run left behind, so
 * the book starts empty — which is what makes the first save the default
 * (addressBook.service.ts: `is_default: count === 0`).
 */

const ADDRESSES_QUERY = `query E2eMyAddresses { myAddresses { id label } }`;
const DELETE_MUTATION = `mutation E2eDeleteAddress($id: ID!) { deleteMyAddress(id: $id) }`;

const HOME = {
  name: 'Riya Duncit',
  phone: '9876501234',
  line1: '12 Residency Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560025',
} as const;
const MOVED_LINE1 = '48 Church Street';

const box = (field: string) => `address-${field}-input`;
const oneLine = (line1: string) => [line1, HOME.city, HOME.state, HOME.pincode].join(', ');

function openAddressBook(): void {
  cy.interceptOperation('MyAddresses');
  cy.visitApp('/address-book');
  cy.wait('@MyAddresses');
  cy.byTestId('address-book-section').should('be.visible');
}

describe('UI Address book', { testIsolation: false }, () => {
  const label = `${runMarker(runAccount().stamp, 'mweb')} Home`;
  let addressId = '';

  before(() => {
    signInRunMember();
    cy.gql<{ myAddresses: Array<{ id: string; label: string }> }>(ADDRESSES_QUERY).then((data) => {
      data.myAddresses
        .filter((row) => row.label.startsWith('[E2E '))
        .forEach((row) => cy.gql(DELETE_MUTATION, { id: row.id }));
    });
  });

  it('AB-01 a name with digits and a short phone number are refused before anything is saved', () => {
    openAddressBook();
    cy.byTestId('address-book-empty').should('have.text', 'Save delivery addresses here to pick them quickly at checkout.');
    cy.byTestId('address-add').should('contain.text', 'Add address').click();
    cy.byTestId('address-form-title').should('have.text', 'Add address');
    cy.byTestId(box('label')).should('have.value', 'Home');
    fill(box('name'), 'Riya 2');
    fill(box('phone'), '12');
    cy.byTestId(box('line1')).focus();
    cy.byTestId('address-name').should('contain.text', 'Name can use letters, spaces, apostrophes and periods only');
    cy.byTestId('address-phone').should('contain.text', 'Enter a valid phone number');
    cy.byTestId('address-save').click();
    cy.byTestId('address-line1').should('contain.text', 'Address line 1 is required');
    cy.byTestId('address-form-sheet').should('be.visible');
    cy.byTestId('address-cancel').click();
    cy.byTestId('address-form-sheet').should('not.exist');
    cy.byTestId('address-book-empty').should('be.visible');
  });

  it('AB-02 the first address is saved as the default and listed on one line', () => {
    cy.byTestId('address-add').click();
    fill(box('label'), label);
    fill(box('name'), HOME.name);
    fill(box('phone'), HOME.phone);
    fill(box('line1'), HOME.line1);
    fill(box('city'), HOME.city);
    fill(box('state'), HOME.state);
    fill(box('pincode'), HOME.pincode);
    cy.interceptOperation('SaveMyAddress');
    cy.byTestId('address-save').should('contain.text', 'Save address').click();
    cy.wait('@SaveMyAddress')
      .its('response.body.data.saveMyAddress')
      .then((saved: { id: string; is_default: boolean }) => {
        addressId = saved.id;
        expect(saved.is_default, 'the first address is the default').to.equal(true);
      });
    cy.byTestId('address-form-sheet').should('not.exist');
    cy.byTestId('address-book-empty').should('not.exist');
    cy.then(() => {
      cy.byTestId(`address-book-row-${addressId}`)
        .should('contain.text', label)
        .and('contain.text', 'Default')
        .and('contain.text', oneLine(HOME.line1));
    });
  });

  it('AB-03 Edit changes the saved address, and Delete empties the book', () => {
    cy.then(() => {
      cy.byTestId(`address-edit-${addressId}`).click();
      cy.byTestId('address-form-title').should('have.text', 'Edit address');
      cy.byTestId(box('label')).should('have.value', label);
      fill(box('line1'), MOVED_LINE1);
      sendCode('SaveMyAddress', () => {
        cy.byTestId('address-save').click();
      });
      cy.byTestId('address-form-sheet').should('not.exist');
      cy.byTestId(`address-book-row-${addressId}`).should('contain.text', oneLine(MOVED_LINE1));
      sendCode('DeleteMyAddress', () => {
        cy.byTestId(`address-delete-${addressId}`).click();
      });
      cy.byTestId(`address-book-row-${addressId}`).should('not.exist');
      cy.byTestId('address-book-empty').should('be.visible');
    });
  });
});
