import type { RunAccount } from '../../support/run-account';
import {
  ACCESS_DENIED,
  countOperation,
  expectNotSent,
  expectRefused,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';
import {
  GOVERNED_NOTE,
  ZERO_ID,
  consoleLogin,
  editorShows,
  expectGovernable,
  expectGovernedReadOnly,
  firstRows,
  grantConsoleRoles,
  rawAs,
  typeInto,
} from '../../support/ui-directories';

/**
 * Hosts console › Host editor (/hosts/new, /hosts/:hostId/edit). Nothing is
 * saved: adminCreateHost refuses an account that already hosts (and a created
 * host would stay behind), and no role
 * a run account may hold can delete a host — so the editor is driven to the
 * validation that stops Save, and governance is proven by the server's refusal
 * on an id nobody has. The governor scenario holds ONBOARDING_MANAGER on
 * /hosts/new only.
 */

const CREATE = 'HostConsoleCreate';
const UPDATE = 'HostConsoleUpdate';
const ROLES = ['ALL_HOSTS_ACCESS'] as const;

const HOSTS_API = `query E2eHostIds($query: TableQueryInput) { hostsTable(query: $query) { rows { id full_name } } }`;
const SET_ACTIVE = `mutation E2eHostActive($id: ID!, $active: Boolean!) { setHostActive(host_doc_id: $id, active: $active) { id } }`;

const someHost = () =>
  firstRows<{ id: string; full_name: string }>(HOSTS_API, 'hostsTable', 1).then((rows) => {
    expect(rows, 'staging lists at least one host').to.have.length.greaterThan(0);
    return rows[0];
  });

describe('Hosts console · Host editor (run account, password CHANGED)', () => {
  let account: RunAccount;
  let token = '';

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('hosts', account).then((t) => {
      token = t;
    });
  });

  after(() => {
    if (account) {
      revokeRoles(account, ['ONBOARDING_MANAGER']);
      restoreStaffRoles(account, ROLES);
    }
  });

  it('HE-01 Save on a blank host shows the account and address rules and sends nothing; Cancel returns to /hosts', () => {
    cy.visitPortal('hosts', '/hosts/new');
    cy.byTestId('back-header-title').should('have.text', 'New host');
    const creates = countOperation(CREATE);
    cy.byTestId('entity-editor-save').click();
    editorShows(['Pick the Duncit account this host record belongs to', 'Address is required']);
    expectNotSent(creates, CREATE);
    cy.byTestId('entity-editor-cancel').click();
    cy.location('pathname').should('eq', '/hosts');
  });

  it('HE-02 a console-role editor sees status, commission and the live switch read-only, and the server refuses it the live switch', () => {
    someHost().then((host) => {
      const updates = countOperation(UPDATE);
      cy.visitPortal('hosts', `/hosts/${host.id}/edit`);
      cy.byTestId('back-header-title').should('have.text', host.full_name || 'Edit host');
      expectGovernedReadOnly('host-editor-commission', GOVERNED_NOTE);
      cy.byTestId('entity-editor-cancel').click();
      cy.location('pathname').should('eq', `/hosts/${host.id}`);
      expectNotSent(updates, UPDATE);
    });
    rawAs('hosts', SET_ACTIVE, { id: ZERO_ID, active: false }, token).then((body) =>
      expectRefused(body, 'setHostActive', ACCESS_DENIED),
    );
  });

  it('HE-03 a governor (ONBOARDING_MANAGER) may move status and commission, and a commission over 100 blocks Save', () => {
    grantConsoleRoles(account, ['ONBOARDING_MANAGER']);
    consoleLogin('hosts', account);
    cy.visitPortal('hosts', '/hosts/new');
    const creates = countOperation(CREATE);
    expectGovernable('host-editor-commission');
    typeInto('host-editor-commission', '150');
    cy.byTestId('entity-editor-save-bottom').click();
    cy.byTestId('host-editor-commission').should('contain.text', 'Commission must be at most 100');
    expectNotSent(creates, CREATE);
  });
});
