import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable, tableRow } from '../../support/tables';
import {
  createDocument,
  deleteMarkedDocuments,
  downloaded,
  expectNotify,
  expectTableEmpty,
  gqlRaw,
  specMarker,
  staffAccount,
  wideViewport,
} from '../../support/ui-staff';

/**
 * Legal › Documents (/documents, /documents/:id): create, quick edit, the
 * Active switch, full edit with its history, the utility actions, delete and
 * the signing workflow — each on a document this spec files itself, named with
 * its marker. Documents are internal (no member surface reads them), and
 * `after()` deletes every one carrying the marker, clones and signed ones too.
 *
 * Signing needs the TYPE method, which a feature flag can switch off; the spec
 * checks the server's list first and fails with that reason rather than skip.
 */

const TABLE = 'legal-documents';
const DOCUMENTS = 'LegalDocumentsTable';
const ZERO_ID = '000000000000000000000000';

const SIGNATURE_METHODS = `query E2eLegalSignatureMethods { legalSignatureMethods }`;

/** A second signature on a signed document — refused before the image is read. */
const SIGN_AGAIN = `mutation E2eSignLegalDocumentAgain($id: ID!, $input: SignLegalDocumentInput!) {
  signLegalDocument(id: $id, input: $input) { id }
}`;

const CREATE_UNNAMED = `mutation E2eCreateUnnamedDocument($input: CreateLegalDocumentInput!) {
  createLegalDocument(input: $input) { id }
}`;

/** `safeFileName` in portals/legal/src/lib/docActions.ts. */
const htmlFileName = (name: string): string =>
  `${name.toLowerCase().trim().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-+|-+$/g, '')}.html`;

interface Doc {
  id: string;
  name: string;
}

function openDocumentsRow(doc: Doc): void {
  openTable('legal', '/documents', DOCUMENTS);
  searchTable(DOCUMENTS, doc.name);
  tableRow(TABLE, doc.id, [doc.name]);
}

function openDocument(doc: Doc): void {
  cy.interceptOperation('LegalDocument');
  cy.visitPortal('legal', `/documents/${doc.id}`);
  cy.wait('@LegalDocument');
  cy.byTestId('back-header-title').should('have.text', doc.name);
}

describe('Legal · Documents (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let token = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'legal-docs');
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED')).then((t) => {
      token = t;
    });
    wideViewport();
  });

  after(() => {
    if (!marker) return;
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
    deleteMarkedDocuments(marker);
  });

  it('LD-01 New Document needs a name and a type, then opens the new document; the server refuses a blank name', () => {
    const name = `${marker} Vendor NDA`;
    openTable('legal', '/documents', DOCUMENTS);
    cy.byTestId('page-header-title').should('have.text', 'Documents');
    cy.byTestId('document-new').click();
    cy.byTestId('document-create-dialog').should('contain.text', 'New Document');
    cy.byTestId('document-create-submit').should('be.disabled');

    cy.byTestId('document-type-select').find('input').type('Vendor Agreement{downArrow}{enter}', { delay: 0 });
    cy.byTestId('document-type-select').find('input').should('have.value', 'Vendor Agreement');
    cy.byTestId('document-create-submit').should('be.disabled');

    cy.byTestId('document-create-name').type(name, { delay: 0 });
    cy.interceptOperation('CreateLegalDocument');
    cy.byTestId('document-create-submit').should('be.enabled').click();
    cy.wait('@CreateLegalDocument').then(({ response }) => {
      const id = response?.body.data.createLegalDocument.id as string;
      cy.location('pathname').should('eq', `/documents/${id}`);
    });
    cy.byTestId('back-header-title').should('have.text', name);
    cy.byTestId('document-history-empty').should('have.text', 'No edits yet — this is the original version.');

    gqlRaw('legal', CREATE_UNNAMED, { input: { name: '  ', document_type: 'Vendor Agreement' } }, token).then((body) => {
      expect(body.errors?.[0]?.message).to.equal('Document name is required');
      expect(body.errors?.[0]?.extensions?.code).to.equal('BAD_USER_INPUT');
    });
  });

  it('LD-02 Edit Document renames from the table, and the Active switch takes a document down and back', () => {
    createDocument(`${marker} quick edit`).then((doc) => {
      const renamed = `${marker} quick edit renamed`;
      openDocumentsRow(doc);
      cy.byTestId(`document-edit-${doc.id}`).click();
      cy.byTestId('document-edit-dialog').should('contain.text', 'Edit Document');
      cy.byTestId('document-edit-title').should('have.value', doc.name).clear();
      cy.byTestId('document-edit-apply').should('be.disabled');
      cy.byTestId('document-edit-dialog').should('contain.text', 'The name this document is listed and searched by.');
      cy.byTestId('document-edit-title').type(renamed, { delay: 0 });
      cy.interceptOperation('UpdateLegalDocument');
      cy.byTestId('document-edit-apply').should('be.enabled').click();
      cy.wait('@UpdateLegalDocument').its('response.body.data.updateLegalDocument.name').should('eq', renamed);
      cy.byTestId('document-edit-dialog').should('not.exist');
      tableRow(TABLE, doc.id, [renamed]);

      cy.interceptOperation('SetLegalDocumentActive');
      cy.byTestId(`document-active-${doc.id}`).click();
      cy.wait('@SetLegalDocumentActive').its('request.body.variables.isActive').should('eq', false);
      expectNotify('success', 'Document is now inactive');
      cy.byTestId(`document-active-label-${doc.id}`).should('have.text', 'Inactive');

      cy.byTestId(`document-active-${doc.id}`).click();
      cy.wait('@SetLegalDocumentActive').its('request.body.variables.isActive').should('eq', true);
      expectNotify('success', 'Document is now active');
      cy.byTestId(`document-active-label-${doc.id}`).should('have.text', 'Active');
    });
  });

  it('LD-03 a full edit on the page writes one version into Update history; an unknown id is not found', () => {
    createDocument(`${marker} full edit`).then((doc) => {
      openDocument(doc);
      cy.byTestId('document-history-empty').should('exist');
      cy.byTestId('document-meta')
        .invoke('text')
        .then((before) => {
          const versionsBefore = Number(/v(\d+)/.exec(before)?.[1]);
          cy.byTestId('document-action-edit').click();
          cy.byTestId('document-editor-description').type(`Edited by ${marker}`, { delay: 0 });
          cy.interceptOperation('UpdateLegalDocument');
          cy.byTestId('document-editor-save').click();
          cy.wait('@UpdateLegalDocument');
          cy.byTestId('document-history-empty').should('not.exist');
          cy.byTestIdPrefix('document-history-').should('have.length', 1);
          cy.byTestId('document-meta').should('contain.text', `v${versionsBefore + 1}`);
        });
    });
    cy.visitPortal('legal', `/documents/${ZERO_ID}`);
    cy.byTestId('document-not-found').should('have.text', 'This document could not be found.');
    cy.visitPortal('legal', '/documents/unknown-id');
    cy.byTestId('document-not-found').should('have.text', 'This document could not be found.');
  });

  it('LD-04 Print opens a print window, Download saves the HTML, Copy copies the text, and Clone opens the copy', () => {
    const words = `Clause one of ${marker}`;
    createDocument(`${marker} utilities`, `<p>${words}</p>`).then((doc) => {
      openDocument(doc);
      cy.window().then((win) => {
        cy.stub(win, 'open').as('printWindow').returns(null);
        cy.stub(win.navigator.clipboard, 'writeText').as('clipboard').resolves();
      });
      cy.byTestId('document-action-print').click();
      cy.get('@printWindow').should('have.been.calledWith', '', '_blank');

      cy.byTestId('document-action-download').click();
      cy.readFile(downloaded(htmlFileName(doc.name))).should('contain', words);

      cy.byTestId('document-action-copy').click();
      cy.get('@clipboard').should('have.been.calledWithMatch', words);

      cy.interceptOperation('CloneLegalDocument');
      cy.byTestId('document-action-clone').click();
      cy.wait('@CloneLegalDocument').then(({ response }) => {
        const cloneId = response?.body.data.cloneLegalDocument.id as string;
        expect(cloneId, 'a new document').to.not.equal(doc.id);
        cy.location('pathname').should('eq', `/documents/${cloneId}`);
      });
      cy.byTestId('back-header-title').should('have.text', `Copy of ${doc.name}`);
    });
  });

  it('LD-05 Delete asks first; Cancel keeps the document, Delete removes it and returns to the list', () => {
    createDocument(`${marker} to delete`).then((doc) => {
      openDocument(doc);
      cy.byTestId('document-action-delete').click();
      cy.byTestId('document-delete-dialog').should('contain.text', 'Delete document?');
      cy.byTestId('document-delete-message').should('contain.text', `This permanently deletes “${doc.name}” and its history.`);
      cy.byTestId('document-delete-cancel').click();
      cy.byTestId('document-delete-dialog').should('not.exist');
      cy.byTestId('back-header-title').should('have.text', doc.name);

      cy.byTestId('document-action-delete').click();
      cy.interceptOperation('DeleteLegalDocument');
      cy.interceptOperation(DOCUMENTS);
      cy.byTestId('document-delete-confirm').click();
      cy.wait('@DeleteLegalDocument').its('response.body.data.deleteLegalDocument').should('eq', true);
      cy.location('pathname').should('eq', '/documents');
      cy.wait(`@${DOCUMENTS}`);
      searchTable(DOCUMENTS, doc.name);
      expectTableEmpty('No documents yet.');
    });
  });

  it('LD-06 Sign walks Preview, Signature and Done, then locks the document and shares the signed copy', () => {
    cy.gql<{ legalSignatureMethods: string[] }>(SIGNATURE_METHODS).then(({ legalSignatureMethods }) => {
      expect(legalSignatureMethods, 'the TYPE signing method is switched on (Tech › Feature Flags)').to.include('TYPE');
    });
    createDocument(`${marker} to sign`).then((doc) => {
      openDocumentsRow(doc);
      cy.byTestId(`document-sign-${doc.id}`).click();
      cy.byTestId('sign-dialog').should('contain.text', doc.name);
      cy.byTestId('sign-status').should('have.text', 'Unsigned');
      cy.byTestId('sign-to-signature').click();
      cy.byTestId('sign-dialog').should(
        'contain.text',
        'Every field is required — a signature without a name, a role and a date is not evidence of anything.',
      );
      cy.byTestId('sign-full-name').type('Suite Signer', { delay: 0 });
      cy.byTestId('sign-designation').type('Legal Manager', { delay: 0 });
      cy.byTestId('signature-tab-TYPE').click();
      cy.byTestId('signature-type-input').type('Suite Signer', { delay: 0 });
      // Initials still empty: the signature is not evidence yet.
      cy.byTestId('sign-submit').should('be.disabled');
      cy.byTestId('sign-initials').type('SS', { delay: 0 });

      cy.interceptOperation('SignLegalDocument');
      cy.byTestId('sign-submit').should('be.enabled').click();
      cy.wait('@SignLegalDocument').its('response.body.data.signLegalDocument.is_locked').should('eq', true);
      expectNotify('success', 'Signed');
      cy.byTestId('sign-locked-notice').should('have.text', 'This is signed and locked. It can no longer be edited.');

      cy.byTestId('sign-share-to').type('not-an-email', { delay: 0 });
      cy.byTestId('sign-share-send').should('be.disabled');
      cy.byTestId('sign-share-to').clear().type(account.email, { delay: 0 });
      cy.interceptOperation('ShareLegalDocument');
      cy.byTestId('sign-share-send').should('be.enabled').click();
      cy.wait('@ShareLegalDocument').its('response.body.data.shareLegalDocument').should('eq', true);
      expectNotify('success', `Sent to ${account.email}`);
      cy.byTestId('sign-share-to').should('have.value', '');

      // Reopened, a signed document goes straight to Done — and it can no
      // longer be edited from the table.
      cy.byTestId('sign-close').click();
      cy.byTestId('sign-dialog').should('not.exist');
      cy.byTestId(`document-sign-${doc.id}`).click();
      cy.byTestId('sign-status').should('have.text', 'Signed');
      cy.byTestId('sign-locked-notice').should('be.visible');
      cy.byTestId('sign-to-signature').should('not.exist');
      cy.byTestId('sign-close').click();
      cy.byTestId(`document-edit-${doc.id}`).should('be.disabled');

      gqlRaw(
        'legal',
        SIGN_AGAIN,
        {
          id: doc.id,
          input: {
            full_name: 'Suite Signer',
            designation: 'Legal Manager',
            initials: 'SS',
            signature_image: 'data:image/png;base64,iVBORw0KGgo=',
            signature_method: 'TYPE',
          },
        },
        token,
      ).then((body) => {
        expect(body.errors?.[0]?.message).to.equal('This contract is already signed.');
      });
    });
  });
});
