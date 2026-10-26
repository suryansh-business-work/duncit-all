import { searchTable, tableRow } from '../../support/tables';
import {
  adminRun,
  expectFieldError,
  fieldInput,
  openRunUser,
  releaseAdmin,
  signInAdmin,
  type AdminRun,
} from '../../support/ui-admin-1';
import { countOperation, expectNotSent, expectTableEmpty, specMarker, wideViewport } from '../../support/ui-staff';

/**
 * Admin › User Call & Email Logs: the Call / Email header actions of a member's
 * details page (ContactActionDialog) and the Call & Email Logs tab
 * (ContactActionsSection, table `admin-user-contact-actions`).
 *
 * "Save Log" only RECORDS an outreach (user.contact.ts recordContactAction —
 * nothing is sent), so the spec logs one email against the run account, finds
 * it, and deletes it. "Open Email" / "Open Dialer" hand a mailto: / tel: link to
 * the browser; the spec stubs `window.open` and checks the link instead of
 * leaving the page. "Start Recorded Call" would place a real call and is not
 * pressed.
 */

const TABLE = 'admin-user-contact-actions';
const ACTIONS = 'UserContactActionsTable';

const LOOKUP = `query E2eAdminContactActions($user_id: ID!, $query: TableQueryInput) {
  userContactActionsTable(user_id: $user_id, query: $query) { total rows { id type subject status } }
}`;

interface ActionRow {
  id: string;
  type: string;
  subject: string;
  status: string;
}

const lookup = (run: AdminRun, search: string) =>
  cy
    .gql<{ userContactActionsTable: { total: number; rows: ActionRow[] } }>(LOOKUP, {
      user_id: run.profile.user_id,
      query: { search, page: 1, page_size: 25 },
    })
    .its('userContactActionsTable');

function stubNativeOpen(): void {
  cy.window().then((win) => {
    cy.stub(win, 'open').as('nativeOpen');
  });
}

describe('Admin · User Call & Email Logs (City Admin)', { testIsolation: false }, () => {
  let run: AdminRun;
  let subject: string;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
      subject = specMarker(r.account, 'admin-contact-email');
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('CEL-01 Email: the dialog targets the member’s address, Open Email hands over a mailto: link, Save Log records an EMAIL row', () => {
    const email = String(run.profile.email);
    wideViewport();
    openRunUser(run, 'contact-logs');
    stubNativeOpen();
    cy.byTestId('admin-user-email').click();
    cy.byTestId('contact-action-title').should('have.text', 'Email User');
    fieldInput('contact-action-target').should('have.value', email).and('be.disabled');
    fieldInput('contact-action-subject').type(subject, { delay: 0 });
    cy.byTestId('contact-action-open-native').click();
    cy.get('@nativeOpen').should('have.been.calledOnceWith', `mailto:${email}?subject=${encodeURIComponent(subject)}`, '_self');

    cy.interceptOperation('RecordUserContactAction');
    cy.interceptOperation(ACTIONS);
    cy.byTestId('contact-action-save').click();
    cy.wait('@RecordUserContactAction').then(({ request, response }) => {
      expect(response?.body.errors, 'recordUserContactAction answers without an error').to.be.undefined;
      expect(request.body.variables.input).to.include({ type: 'EMAIL', target: email, subject, status: 'LOGGED' });
    });
    cy.byTestId('contact-action-dialog').should('not.exist');
    cy.byTestId('admin-user-toast').should('contain.text', 'Contact log saved');
    cy.wait(`@${ACTIONS}`);
    lookup(run, subject).then(({ rows }) => {
      expect(rows, 'one log carries the subject').to.have.length(1);
      tableRow(TABLE, rows[0].id, ['EMAIL', email, 'LOGGED', subject]);
    });
  });

  it('CEL-02 Call: the dialog targets the member’s phone (Open Dialer hands over tel:), or says there is no target and disables every action', () => {
    const phone = `${run.profile.phone_extension ?? ''}${run.profile.phone_number ?? ''}`.trim();
    openRunUser(run);
    stubNativeOpen();
    cy.byTestId('admin-user-call').click();
    cy.byTestId('contact-action-title').should('have.text', 'Call User');
    if (run.profile.phone_number) {
      fieldInput('contact-action-target').should('have.value', phone);
      cy.byTestId('contact-action-open-native').click();
      cy.get('@nativeOpen').should('have.been.calledOnceWith', `tel:${phone}`, '_self');
    } else {
      cy.byTestId('contact-action-target').should('contain.text', 'No target available for this contact action.');
      for (const action of ['contact-action-save', 'contact-action-open-native', 'contact-action-start-recorded']) {
        cy.byTestId(action).should('be.disabled');
      }
    }
    cy.byTestId('contact-action-cancel').click();
    cy.byTestId('contact-action-dialog').should('not.exist');
  });

  it('CEL-03 the log fields validate before anything is sent: a non-http recording URL and an over-long subject', () => {
    const records = countOperation('RecordUserContactAction');
    const starts = countOperation('StartRecordedUserCall');
    openRunUser(run);
    cy.byTestId('admin-user-call').click();
    fieldInput('contact-action-recording-url').type('ftp://recordings.example/1').blur();
    expectFieldError('contact-action-recording-url', 'Recording URL must start with http:// or https://');
    cy.byTestId('contact-action-cancel').click();

    cy.byTestId('admin-user-email').click();
    fieldInput('contact-action-subject').type('s'.repeat(161), { delay: 0 }).blur();
    expectFieldError('contact-action-subject', 'Subject must be 160 characters or fewer');
    cy.byTestId('contact-action-save').click();
    cy.byTestId('contact-action-dialog').should('be.visible');
    cy.byTestId('contact-action-cancel').click();
    expectNotSent(records, 'RecordUserContactAction');
    expectNotSent(starts, 'StartRecordedUserCall');
  });

  it('CEL-04 the logged email can be found by its subject and deleted; a miss reads "No contact logs yet."', () => {
    wideViewport();
    lookup(run, subject).then(({ rows }) => {
      expect(rows, 'the email CEL-01 logged').to.have.length(1);
      const [row] = rows;
      cy.interceptOperation(ACTIONS);
      openRunUser(run, 'contact-logs');
      cy.wait(`@${ACTIONS}`);
      searchTable(ACTIONS, subject);
      tableRow(TABLE, row.id, [subject]);
      cy.interceptOperation('DeleteUserContactAction');
      cy.byTestId(`${TABLE}-row-${row.id}`).find('[data-testid="admin-user-contact-log-delete"]').click();
      cy.wait('@DeleteUserContactAction').its('response.body.data.deleteUserContactAction').should('eq', true);
      cy.byTestId(`${TABLE}-row-${row.id}`).should('not.exist');
      expectTableEmpty('No contact logs yet.');
      lookup(run, subject).its('total').should('eq', 0);
    });
  });
});
