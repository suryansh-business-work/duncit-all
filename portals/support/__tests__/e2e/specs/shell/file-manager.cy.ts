import type { RunAccount } from '../../support/run-account';
import { openAppsTool, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › File Manager (apps drawer), on Support, as a staff account
 * WITHOUT a write role (only SUPER_ADMIN and TECH_MANAGER change files —
 * file-manager/index.tsx WRITE_ROLES): it browses ImageKit's `mediaFiles` 40 at
 * a time, searches by name after a debounce, and offers Copy but no rename,
 * tag or delete.
 *
 * Not driven: uploading (the file would stay in the shared ImageKit library,
 * and this account cannot delete it) and the clipboard toast.
 */

const PAGE_SIZE = 40;

interface MediaPage {
  mediaFiles: { fileId: string; name: string }[];
}

describe('Portal Shell · File Manager (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('FM-01 the dialog opens on the first 40 files, one card per file the server returned', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('MediaFiles');
    openAppsTool('file-manager');
    cy.byTestId('file-manager-dialog')
      .should('contain.text', 'File Manager')
      .and('contain.text', 'Every file uploaded to ImageKit. Upload, find one, copy its link at any size.');
    cy.wait('@MediaFiles').then(({ request, response }) => {
      expect(request.body.variables).to.include({ skip: 0, limit: PAGE_SIZE });
      const files = (response?.body.data as MediaPage).mediaFiles;
      if (files.length === 0) throw new Error('The staging ImageKit library returned no files for the File Manager.');
      cy.byTestIdPrefix('file-manager-card-').should('have.length', files.length);
      cy.byTestId(`file-manager-card-${files[0].fileId}`).should('contain.text', files[0].name);
    });
  });

  it('FM-02 a search goes to the server once typing settles; nothing matching says so', () => {
    const term = `zz-e2e-${account.stamp}`;
    openSignedIn('support', '/');
    cy.interceptOperation('MediaFiles');
    openAppsTool('file-manager');
    cy.wait('@MediaFiles');
    cy.interceptOperation('MediaFiles', 'Searched');
    cy.byTestId('file-manager-search').type(term);
    cy.wait('@Searched').its('request.body.variables').should('include', { search: term, skip: 0 });
    cy.byTestIdPrefix('file-manager-card-').should('not.exist');
    cy.byTestId('file-manager-dialog').should('contain.text', `Nothing matches “${term}”.`);
  });

  it('FM-03 Next is offered only after a full page, and pages by 40', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('MediaFiles');
    openAppsTool('file-manager');
    cy.wait('@MediaFiles').then(({ response }) => {
      const count = (response?.body.data as MediaPage).mediaFiles.length;
      if (count < PAGE_SIZE) {
        cy.byTestId('file-manager-next').should('be.disabled');
        return;
      }
      cy.byTestId('file-manager-prev').should('be.disabled');
      cy.interceptOperation('MediaFiles', 'PageTwo');
      cy.byTestId('file-manager-next').should('be.enabled').click();
      cy.wait('@PageTwo').its('request.body.variables').should('include', { skip: PAGE_SIZE, limit: PAGE_SIZE });
      cy.interceptOperation('MediaFiles', 'PageOne');
      cy.byTestId('file-manager-prev').should('be.enabled').click();
      cy.wait('@PageOne').its('request.body.variables').should('include', { skip: 0 });
    });
  });

  it('FM-04 without a write role a file opens on Info alone, with Copy and no Delete', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('MediaFiles');
    openAppsTool('file-manager');
    cy.wait('@MediaFiles').then(({ response }) => {
      const [first] = (response?.body.data as MediaPage).mediaFiles;
      if (!first) throw new Error('The staging ImageKit library returned no files to open.');
      cy.byTestId(`file-manager-card-${first.fileId}`).click();
      cy.byTestId('file-manager-tab-info').should('be.visible');
      cy.byTestId('file-manager-tab-edit').should('not.exist');
      cy.byTestId('file-manager-details-copy').should('be.visible');
      cy.byTestId('file-manager-delete').should('not.exist');
    });
  });
});
