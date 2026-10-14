import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable, tableRow } from '../../support/tables';
import {
  countOperation,
  expectConfirm,
  expectNotSent,
  expectNotify,
  pickOption,
  specMarker,
  staffAccount,
  wideViewport,
} from '../../support/ui-staff';

/**
 * Support › FAQs: App FAQs (/faqs), Partner FAQs (/partners/faqs) and the FAQ
 * Submissions queue (/faqs/submissions).
 *
 * The FAQs this spec writes carry its marker and are saved HIDDEN, so the app's
 * Help Centre and the Partners console never show them; each is deleted by the
 * scenario that made it, and `after()` removes any a failure left behind.
 *
 * The submissions are the run account's own questions, asked through
 * `submitFaqQuestion` as the signed-in run account (the acknowledgement goes to
 * its own mailbox). There is no delete for a submission, so triage leaves them
 * Converted / Ignored — out of the NEW queue Support works from.
 */

const FAQS_LOOKUP = `query E2eFaqsLookup($query: TableQueryInput) {
  faqsTable(query: $query) { rows { id question } }
}`;

const DELETE_FAQ_API = `mutation E2eDeleteFaq($id: ID!) { deleteFaq(faq_doc_id: $id) }`;

const SUBMIT_QUESTION = `mutation E2eSubmitFaqQuestion($input: SubmitFaqQuestionInput!) {
  submitFaqQuestion(input: $input) { ok message }
}`;

const SUBMISSIONS_LOOKUP = `query E2eFaqSubmissions($query: TableQueryInput) {
  faqSubmissionsTable(query: $query) { rows { id question email status } }
}`;

interface Submission {
  id: string;
  question: string;
  email: string | null;
  status: string;
}

/** In the open New FAQ dialog: fill, hide, save; yields the new FAQ's id. */
function createHiddenFaq(question: string): Cypress.Chainable<string> {
  cy.byTestId('faq-form-question').type(question, { delay: 0 });
  cy.byTestId('faq-form-answer').type('Answered by the staff portals suite.', { delay: 0 });
  cy.byTestId('faq-form-active').find('input').uncheck().should('not.be.checked');
  cy.interceptOperation('SupportCreateFaq');
  cy.byTestId('faq-form-save').click();
  return cy.wait('@SupportCreateFaq').then(({ request, response }) => {
    expect(request.body.variables.input.is_active, 'saved hidden').to.be.false;
    return response?.body.data.createFaq.id as string;
  });
}

/** The row's Delete action, the confirmation, and the row gone. */
function deleteFaq(tableId: string, id: string, title: string, toast: string): void {
  cy.byTestId(`${tableId}-row-${id}`).within(() => cy.byTestId('row-action-delete').click());
  expectConfirm(title);
  cy.byTestId('confirm-dialog-message').should('have.text', 'This action cannot be undone.');
  cy.interceptOperation('SupportDeleteFaq');
  cy.byTestId('confirm-dialog-confirm').click();
  cy.wait('@SupportDeleteFaq').its('response.body.data.deleteFaq').should('eq', true);
  expectNotify('success', toast);
  cy.byTestId(`${tableId}-row-${id}`).should('not.exist');
}

describe('Support · FAQs (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'support-faqs');
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
    wideViewport();
  });

  after(() => {
    if (!marker) return;
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
    cy.gql<{ faqsTable: { rows: { id: string; question: string }[] } }>(FAQS_LOOKUP, {
      query: { search: marker, page: 1, page_size: 25 },
    }).then((data) => {
      for (const row of data.faqsTable.rows.filter((r) => r.question.includes(marker))) {
        cy.gql(DELETE_FAQ_API, { id: row.id });
      }
    });
  });

  it('SFQ-01 App FAQs: the form refuses a short question and a blank answer, saves a hidden FAQ, edits it and deletes it', () => {
    const question = `${marker} How do refunds work?`;
    const edited = `${marker} How do refunds work for a cancelled pod?`;
    openTable('support', '/faqs', 'SupportFaqsTable');
    cy.byTestId('faq-new').click();
    cy.byTestId('faq-form-title').should('have.text', 'New FAQ');
    const creates = countOperation('SupportCreateFaq');
    cy.byTestId('faq-form-question').type('Abcd', { delay: 0 });
    cy.byTestId('faq-form-save').click();
    cy.byTestId('faq-form-dialog')
      .should('contain.text', 'Question must be at least 5 characters')
      .and('contain.text', 'Answer must be at least 5 characters');
    expectNotSent(creates, 'SupportCreateFaq');
    cy.byTestId('faq-form-question').type('{esc}');
    cy.byTestId('faq-form-dialog').should('not.exist');

    cy.byTestId('faq-new').click();
    createHiddenFaq(question).then((id) => {
      expectNotify('success', 'FAQ created');
      searchTable('SupportFaqsTable', marker);
      tableRow('support-faqs', id, [question, 'Hidden']);

      cy.byTestId(`support-faqs-row-${id}`).within(() => cy.byTestId('row-action-edit').click());
      cy.byTestId('faq-form-title').should('have.text', 'Edit FAQ');
      cy.byTestId('faq-form-question').should('have.value', question).clear().type(edited, { delay: 0 });
      cy.interceptOperation('SupportUpdateFaq');
      cy.byTestId('faq-form-save').click();
      cy.wait('@SupportUpdateFaq').its('request.body.variables.input.is_active').should('eq', false);
      expectNotify('success', 'FAQ updated');
      tableRow('support-faqs', id, [edited, 'Hidden']);

      deleteFaq('support-faqs', id, 'Delete this FAQ?', 'Deleted');
    });
  });

  it('SFQ-02 Partner FAQs: a hidden Venue FAQ is created under its topic and deleted', () => {
    const question = `${marker} When is my venue paid?`;
    openTable('support', '/partners/faqs', 'SupportFaqsTable');
    cy.byTestId('faq-new').click();
    cy.byTestId('faq-form-title').should('have.text', 'New Partner FAQ');
    pickOption('faq-form-category', 'faq-category-option-VENUE');
    createHiddenFaq(question).then((id) => {
      expectNotify('success', 'Partner FAQ created');
      searchTable('SupportFaqsTable', marker);
      tableRow('support-partner-faqs', id, [question, 'Venue', 'Hidden']);
      deleteFaq('support-partner-faqs', id, 'Delete this partner FAQ?', 'Partner FAQ deleted');
    });
  });

  it('SFQ-03 FAQ Submissions: search by email shows only that person, Mark Converted and Ignore set the status', () => {
    for (const which of ['convert', 'ignore']) {
      cy.gql<{ submitFaqQuestion: { ok: boolean } }>(SUBMIT_QUESTION, {
        input: { question: `${marker} question to ${which}?`, email: account.email },
      })
        .its('submitFaqQuestion.ok')
        .should('eq', true);
    }
    cy.gql<{ faqSubmissionsTable: { rows: Submission[] } }>(SUBMISSIONS_LOOKUP, {
      query: { search: marker, page: 1, page_size: 10 },
    }).then(({ faqSubmissionsTable }) => {
      const find = (which: string) => {
        const row = faqSubmissionsTable.rows.find((r) => r.question.includes(`question to ${which}`));
        expect(row, `the submission to ${which}`).to.not.be.undefined;
        return row as Submission;
      };
      const toConvert = find('convert');
      const toIgnore = find('ignore');

      openTable('support', '/faqs/submissions', 'SupportFaqSubmissionsTable');
      cy.byTestId('page-header-title').should('have.text', 'FAQ Submissions');
      searchTable('SupportFaqSubmissionsTable', account.email);
      cy.byTestIdPrefix('support-faq-submissions-row-').each(($row) => {
        expect($row.text(), 'only this person’s submissions').to.contain(account.email);
      });
      tableRow('support-faq-submissions', toConvert.id, [toConvert.question]);
      tableRow('support-faq-submissions', toIgnore.id, [toIgnore.question]);

      cy.interceptOperation('SupportUpdateFaqSubmissionStatus');
      cy.byTestId(`faq-submission-convert-${toConvert.id}`).should('be.enabled').click();
      cy.wait('@SupportUpdateFaqSubmissionStatus').its('response.body.errors').should('be.undefined');
      cy.byTestId(`faq-submission-status-${toConvert.id}`).should('have.text', 'Converted');
      cy.byTestId(`faq-submission-convert-${toConvert.id}`).should('be.disabled');

      cy.byTestId(`faq-submission-ignore-${toIgnore.id}`).should('be.enabled').click();
      cy.wait('@SupportUpdateFaqSubmissionStatus').its('response.body.errors').should('be.undefined');
      cy.byTestId(`faq-submission-status-${toIgnore.id}`).should('have.text', 'Ignored');
      cy.byTestId(`faq-submission-ignore-${toIgnore.id}`).should('be.disabled');
    });
  });
});
