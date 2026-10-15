import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable } from '../../support/tables';
import {
  countOperation,
  expectNotSent,
  expectTableEmpty,
  pickOption,
  selectShows,
  specMarker,
  wideViewport,
} from '../../support/ui-staff';
import {
  createRunSurvey,
  deleteMarkedSurveys,
  freeSurveySlot,
  onboardingAccount,
  releaseOnboarding,
  scopePath,
  signInOnboarding,
  type SurveySlot,
} from '../../support/ui-onboarding';

/**
 * Onboarding · Surveys: the hub (/surveys), a kind's category-scoped list
 * (/surveys/kind/:kind) and the builder (/surveys/new, /surveys/:id/edit).
 *
 * Surveys are what real applicants answer, so the spec edits only its own: a
 * Club Admin survey filed through the API on a Sub category no survey uses,
 * INACTIVE (`activeFor` skips `is_active: false`), titled with the run's marker
 * and deleted by the scenario that tests Delete (and again in `after()`). The
 * kind-level default survey is shared — its builder is opened, never saved.
 */

const KIND = 'CLUB_ADMIN';
const LIST = '/surveys/kind/club-admin';
const TABLE = 'onboarding-surveys';
const SURVEYS = 'SurveysTable';

describe('Onboarding · Surveys (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let title = '';
  let surveyId = '';
  let slot: SurveySlot;

  before(() => {
    account = onboardingAccount();
    marker = specMarker(account, 'onboarding-surveys');
    title = `${marker} club admin survey`;
    signInOnboarding(account);
    deleteMarkedSurveys(KIND, marker);
    freeSurveySlot(KIND).then((free) => {
      slot = free;
      createRunSurvey(KIND, free, title).then((id) => {
        surveyId = id;
      });
    });
  });

  after(() => {
    if (account) {
      signInOnboarding(account);
      deleteMarkedSurveys(KIND, marker);
    }
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OS-01 the hub shows one card per audience, and Club Admin opens its kind list', () => {
    cy.visitPortal('onboarding', '/surveys');
    for (const slug of ['venue', 'host', 'seller', 'club-admin']) cy.byTestId(`survey-kind-card-${slug}`).should('be.visible');
    cy.byTestId('survey-kind-card-club-admin').should('contain.text', 'Club Admin Surveys').click();
    cy.location('pathname').should('eq', LIST);
    cy.byTestId('surveys-kind-title').should('have.text', 'Club Admin Surveys');
  });

  it('OS-02 the kind list asks only for that kind’s category-scoped surveys, searches by title, and Back returns to the hub', () => {
    cy.interceptOperation(SURVEYS);
    cy.visitPortal('onboarding', LIST);
    cy.wait(`@${SURVEYS}`).then(({ request }) => {
      const filters = request.body.variables.query.filters as { field: string; op: string; value?: string }[];
      expect(filters, 'pinned to the kind').to.deep.include({ field: 'kind', op: 'eq', value: KIND });
      expect(filters.find((f) => f.field === 'super_category_id')?.op, 'never the unscoped kind default').to.equal('in');
    });
    searchTable(SURVEYS, `${marker} no survey is called this`);
    expectTableEmpty('No category-specific surveys yet. Create one with New survey.');
    cy.byTestId('back-button').should('contain.text', 'Back to Surveys').click();
    cy.location('pathname').should('eq', '/surveys');
  });

  it('OS-03 an unknown kind slug goes back to the hub, and New survey opens the builder for the kind', () => {
    cy.visitPortal('onboarding', '/surveys/kind/no-such-kind');
    cy.location('pathname').should('eq', '/surveys');
    cy.byTestId('survey-kind-card-venue').should('be.visible');

    cy.visitPortal('onboarding', LIST);
    cy.byTestId('surveys-new').click();
    cy.location('pathname').should('eq', '/surveys/new');
    cy.location('search').should('eq', `?kind=${KIND}`);
    cy.byTestId('survey-builder-title').should('have.text', 'New survey');
    selectShows('survey-meta-kind', 'Club Admin');
  });

  it('OS-04 the run’s scoped survey is listed with its scope path, one question and Off', () => {
    wideViewport();
    openTable('onboarding', LIST, SURVEYS);
    searchTable(SURVEYS, marker);
    cy.byTestId(`${TABLE}-row-${surveyId}`)
      .should('contain.text', title)
      .and('contain.text', scopePath(slot))
      .and('contain.text', 'Off');
  });

  it('OS-05 the builder adds a multiple-choice question with options and a section heading, reorders them, and the save survives a reload', () => {
    cy.interceptOperation('SurveyById');
    cy.visitPortal('onboarding', `/surveys/${surveyId}/edit`);
    cy.wait('@SurveyById');
    cy.byTestId('survey-builder-title').should('have.text', 'Edit survey');
    cy.byTestId('survey-meta-title').find('input').should('have.value', title);
    cy.byTestId('survey-meta-active').find('input').should('not.be.checked');

    pickOption('survey-builder-add-type', 'survey-add-type-MCQ');
    cy.byTestId('survey-builder-add-question').click();
    cy.byTestId('survey-question-1').within(() => {
      cy.byTestId('survey-question-label').find('input').type('When can you host?', { delay: 0 });
      cy.byTestId('survey-option-0').type('Weekdays', { delay: 0 });
      cy.byTestId('survey-option-add').click();
      cy.byTestId('survey-option-1').type('Weekends', { delay: 0 });
    });
    pickOption('survey-builder-add-type', 'survey-add-type-SECTION');
    cy.byTestId('survey-builder-add-question').click();
    cy.byTestId('survey-question-2').within(() => {
      cy.byTestId('survey-question-label').find('input').type('About your club', { delay: 0 });
      cy.byTestId('survey-question-up').click();
    });
    cy.byTestId('survey-question-1').find('[data-testid="survey-question-label"] input').should('have.value', 'About your club');

    cy.interceptOperation('UpdateSurvey');
    cy.byTestId('survey-builder-save').click();
    cy.wait('@UpdateSurvey').then(({ request, response }) => {
      expect(response?.body.errors, 'UpdateSurvey is accepted').to.be.undefined;
      const { input } = request.body.variables;
      expect(input.is_active, 'the run survey stays inactive').to.equal(false);
      expect(input.questions.map((q: { type: string }) => q.type)).to.deep.equal(['TEXT', 'SECTION', 'MCQ']);
      expect(input.questions[2].options).to.deep.equal(['Weekdays', 'Weekends']);
    });
    cy.byTestId('survey-builder-snack').should('contain.text', 'Survey saved');

    cy.visitPortal('onboarding', `/surveys/${surveyId}/edit`);
    cy.wait('@SurveyById');
    cy.byTestId('survey-question-1').find('[data-testid="survey-question-label"] input').should('have.value', 'About your club');
    cy.byTestId('survey-question-2').within(() => {
      cy.byTestId('survey-question-label').find('input').should('have.value', 'When can you host?');
      cy.byTestId('survey-option-0').should('have.value', 'Weekdays');
      cy.byTestId('survey-option-1').should('have.value', 'Weekends');
    });
  });

  it('OS-06 the server refuses a question without a label, and nothing of it is stored', () => {
    cy.interceptOperation('SurveyById');
    cy.visitPortal('onboarding', `/surveys/${surveyId}/edit`);
    cy.wait('@SurveyById').then(({ response }) => {
      const stored = (response?.body.data.surveyById.questions as unknown[]).length;
      pickOption('survey-builder-add-type', 'survey-add-type-TEXT');
      cy.byTestId('survey-builder-add-question').click();
      cy.interceptOperation('UpdateSurvey');
      cy.byTestId('survey-builder-save').click();
      cy.wait('@UpdateSurvey').its('response.body.errors.0.message').should('eq', 'Every question needs a label');
      cy.byTestId('survey-builder-error').should('contain.text', 'Every question needs a label');

      cy.visitPortal('onboarding', `/surveys/${surveyId}/edit`);
      cy.wait('@SurveyById').its('response.body.data.surveyById.questions').should('have.length', stored);
    });
  });

  it('OS-07 Default Survey opens the kind-level builder with no kind or scope picker, and nothing is saved', () => {
    const updates = countOperation('UpdateSurvey');
    const creates = countOperation('CreateSurvey');
    cy.visitPortal('onboarding', LIST);
    cy.byTestId('surveys-default').click();
    cy.location('search').should('contain', 'default=1');
    cy.location('pathname').then((path) => {
      const verb = path === '/surveys/new' ? 'New' : 'Edit';
      cy.byTestId('survey-builder-title').should('have.text', `${verb} Club Admin default survey`);
    });
    cy.byTestId('survey-meta-title').should('be.visible');
    cy.byTestId('survey-meta-kind').should('not.exist');
    cy.byTestId('back-button').click();
    cy.location('pathname').should('eq', LIST);
    expectNotSent(updates, 'UpdateSurvey');
    expectNotSent(creates, 'CreateSurvey');
  });

  it('OS-08 Delete asks first: Cancel keeps the run’s survey, Delete removes it and the row leaves the list', () => {
    wideViewport();
    openTable('onboarding', LIST, SURVEYS);
    searchTable(SURVEYS, marker);
    cy.byTestId(`${TABLE}-row-${surveyId}`).within(() => cy.byTestId('row-action-delete').click());
    cy.byTestId('survey-delete-dialog').should('contain.text', 'Delete survey?');
    cy.byTestId('survey-delete-cancel').click();
    cy.byTestId('survey-delete-dialog').should('not.exist');
    cy.byTestId(`${TABLE}-row-${surveyId}`).should('exist');

    cy.byTestId(`${TABLE}-row-${surveyId}`).within(() => cy.byTestId('row-action-delete').click());
    cy.interceptOperation('DeleteSurvey');
    cy.byTestId('survey-delete-confirm').click();
    cy.wait('@DeleteSurvey').its('response.body.data.deleteSurvey').should('eq', true);
    cy.byTestId('survey-delete-dialog').should('not.exist');
    cy.wait(`@${SURVEYS}`);
    cy.byTestId(`${TABLE}-row-${surveyId}`).should('not.exist');
  });
});
