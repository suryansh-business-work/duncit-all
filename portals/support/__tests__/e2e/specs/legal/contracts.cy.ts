import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable, tableRow } from '../../support/tables';
import {
  expectConfirm,
  expectNotify,
  gqlRaw,
  pickOption,
  specMarker,
  staffAccount,
  wideViewport,
} from '../../support/ui-staff';

/**
 * Legal › Contracts (/contracts): add, view, edit, archive and the server's
 * refusal to share an unsigned contract — every one on a contract this spec
 * files itself, titled with its marker, with the run account as counterparty.
 * The portal has no Delete (Archive keeps the record), so `after()` removes the
 * spec's contracts through `deleteContract`, which Legal holds on the server.
 */

const TABLE = 'legal-contracts';
const CONTRACTS = 'LegalContractsTable';

const CREATE_CONTRACT_API = `mutation E2eCreateContract($input: CreateContractInput!) {
  createContract(input: $input) { id title status }
}`;

const CONTRACTS_LOOKUP = `query E2eContractsLookup($query: TableQueryInput) {
  contractsTable(query: $query) { rows { id title } }
}`;

const DELETE_CONTRACT_API = `mutation E2eDeleteContract($id: ID!) { deleteContract(id: $id) }`;

const SHARE_CONTRACT_API = `mutation E2eShareContract($id: ID!, $to: String!) {
  shareContract(id: $id, to: $to)
}`;

interface Contract {
  id: string;
  title: string;
  status: string;
}

const createContract = (title: string, status = 'ACTIVE') =>
  cy
    .gql<{ createContract: Contract }>(CREATE_CONTRACT_API, {
      input: { title, counterparty: 'Staff portals suite', status, description: '', content: '<p>Terms.</p>' },
    })
    .then((data) => data.createContract);

function openContractRow(contract: Contract): void {
  openTable('legal', '/contracts', CONTRACTS);
  searchTable(CONTRACTS, contract.title);
  tableRow(TABLE, contract.id, [contract.title]);
}

describe('Legal · Contracts (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let token = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'legal-contracts');
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
    cy.gql<{ contractsTable: { rows: { id: string; title: string }[] } }>(CONTRACTS_LOOKUP, {
      query: { search: marker, page: 1, page_size: 50 },
    }).then((data) => {
      for (const row of data.contractsTable.rows.filter((r) => r.title.includes(marker))) {
        cy.gql(DELETE_CONTRACT_API, { id: row.id });
      }
    });
  });

  it('LC-01 Add Contract needs only a Title, and the new row reads Active and Unsigned with a Contract ID', () => {
    const title = `${marker} supplier contract`;
    openTable('legal', '/contracts', CONTRACTS);
    cy.byTestId('page-header-title').should('have.text', 'Contracts');
    cy.byTestId('contract-new').click();
    cy.byTestId('contract-form-title').should('have.text', 'New Contract');
    cy.byTestId('contract-form-status').find('[role="combobox"]').should('have.text', 'Draft');
    cy.byTestId('contract-form-save').should('have.text', 'Create Contract').and('be.disabled');

    cy.byTestId('contract-form-title-input').type(title, { delay: 0 });
    cy.byTestId('contract-form-counterparty').type('Staff portals suite', { delay: 0 });
    pickOption('contract-form-status', 'contract-status-option-ACTIVE');
    cy.interceptOperation('CreateLegalContract');
    cy.byTestId('contract-form-save').should('be.enabled').click();
    cy.wait('@CreateLegalContract').then(({ response }) => {
      const created = response?.body.data.createContract as { id: string; contract_no: string };
      expect(created.contract_no, 'a Contract ID is minted').to.match(/\S/);
      expectNotify('success', 'Contract created');
      cy.byTestId('contract-form-dialog').should('not.exist');
      searchTable(CONTRACTS, title);
      tableRow(TABLE, created.id, [created.contract_no, title, 'Staff portals suite']);
      cy.byTestId(`contract-status-${created.id}`).should('have.text', 'Active');
      cy.byTestId(`contract-signing-${created.id}`).should('have.text', 'Unsigned');
    });
  });

  it('LC-02 View opens the contract locked; Edit saves a new counterparty', () => {
    createContract(`${marker} contract to edit`).then((contract) => {
      openContractRow(contract);
      cy.byTestId(`contract-view-${contract.id}`).click();
      cy.byTestId('contract-form-title').should('have.text', `View · ${contract.title}`);
      cy.byTestId('contract-form-title-input').should('be.disabled');
      cy.byTestId('contract-form-counterparty').should('be.disabled');
      cy.byTestId('contract-form-save').should('not.exist');
      cy.byTestId('contract-form-close').should('have.text', 'Close').click();
      cy.byTestId('contract-form-dialog').should('not.exist');

      cy.byTestId(`contract-edit-${contract.id}`).click();
      cy.byTestId('contract-form-title').should('have.text', `Edit · ${contract.title}`);
      cy.byTestId('contract-form-counterparty').clear().type('Counterparty renamed by the suite', { delay: 0 });
      cy.interceptOperation('UpdateLegalContract');
      cy.byTestId('contract-form-save').should('have.text', 'Save').click();
      cy.wait('@UpdateLegalContract')
        .its('response.body.data.updateContract.counterparty')
        .should('eq', 'Counterparty renamed by the suite');
      expectNotify('success', 'Contract updated');
      tableRow(TABLE, contract.id, ['Counterparty renamed by the suite']);
    });
  });

  it('LC-03 Archive asks first, keeps the row and its ID, then can no longer be pressed', () => {
    createContract(`${marker} contract to archive`).then((contract) => {
      openContractRow(contract);
      cy.byTestId(`contract-archive-${contract.id}`).should('be.enabled').click();
      expectConfirm('Archive contract?');
      cy.byTestId('confirm-dialog-message').should(
        'contain.text',
        `“${contract.title}” moves to Archived. It stays in the table and keeps its Contract ID — nothing is deleted.`,
      );
      cy.interceptOperation('ArchiveLegalContract');
      cy.byTestId('confirm-dialog-confirm').should('have.text', 'Archive').click();
      cy.wait('@ArchiveLegalContract').its('response.body.data.archiveContract.status').should('eq', 'ARCHIVED');
      expectNotify('success', 'Contract archived');
      cy.byTestId(`contract-status-${contract.id}`).should('have.text', 'Archived');
      cy.byTestId(`contract-archive-${contract.id}`).should('be.disabled');
    });
  });

  it('LC-04 the server refuses to share a contract that has not been signed', () => {
    createContract(`${marker} unsigned contract`).then((contract) => {
      gqlRaw('legal', SHARE_CONTRACT_API, { id: contract.id, to: account.email }, token).then((body) => {
        expect(body.errors?.[0]?.message).to.equal('This contract has not been signed yet.');
      });
      openContractRow(contract);
      cy.byTestId(`contract-signing-${contract.id}`).should('have.text', 'Unsigned');
    });
  });
});
