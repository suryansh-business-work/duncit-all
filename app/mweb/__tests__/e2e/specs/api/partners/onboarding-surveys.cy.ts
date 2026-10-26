/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused, expectPage } from '../../../support/api-partners';

/**
 * Onboarding surveys (/surveys) — the onboarding desk (SUPER_ADMIN,
 * ONBOARDING_MANAGER: survey/survey.resolver.ts `SURVEY_RW`) reads and writes
 * the surveys. A save is validated before anything is created
 * (survey.service.ts `normaliseQuestions`): every question needs a label and
 * every MCQ an option, so the invalid surveys below are refused and none is
 * ever stored. Scenario map: Partners › Onboarding surveys.
 */

const TABLE = `query E2eSurveysTable { surveysTable(query: { page_size: 1 }) { total } }`;
const CREATE = `mutation E2eCreateSurvey($input: CreateSurveyInput!) { createSurvey(input: $input) { __typename } }`;

const blankLabel = { kind: 'HOST', is_active: false, questions: [{ type: 'TEXT', label: '   ' }] };
const mcqWithoutOptions = { kind: 'HOST', is_active: false, questions: [{ type: 'MCQ', label: 'Pick one', options: [] }] };

describe('API · Onboarding surveys are the onboarding desk’s, and saved only when valid', { testIsolation: false }, () => {
  let memberToken = '';
  let hostsStaffToken = '';
  let onboardingToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['ALL_HOSTS_ACCESS']).then((token) => {
      hostsStaffToken = token;
    });
    revokeRunRoles(['ALL_HOSTS_ACCESS']);
    signInRunAs(['ONBOARDING_MANAGER']).then((token) => {
      onboardingToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ONBOARDING_MANAGER']);
  });

  it('OS-01 the survey list is refused signed out, to a member and to a directory console role', () => {
    expectEachRefused('surveysTable', TABLE, {}, [
      [null, SIGNED_OUT],
      [memberToken, ACCESS_DENIED],
      [hostsStaffToken, ACCESS_DENIED],
    ]);
  });

  it('OS-02 a directory console role cannot create a survey', () => {
    expectEachRefused('createSurvey', CREATE, { input: blankLabel }, [
      [memberToken, ACCESS_DENIED],
      [hostsStaffToken, ACCESS_DENIED],
    ]);
  });

  it('OS-03 ONBOARDING_MANAGER reads the survey list', () => {
    cy.gqlRaw(TABLE, {}, { token: onboardingToken }).then((body) => expectPage('surveysTable', body));
  });

  it('OS-04 a question without a label is refused on save', () => {
    expectEachRefused('createSurvey', CREATE, { input: blankLabel }, [
      [onboardingToken, { code: 'BAD_USER_INPUT', message: 'Every question needs a label' }],
    ]);
  });

  it('OS-05 a multiple-choice question without options is refused on save', () => {
    expectEachRefused('createSurvey', CREATE, { input: mcqWithoutOptions }, [
      [onboardingToken, { code: 'BAD_USER_INPUT', message: 'MCQ "Pick one" needs at least one option' }],
    ]);
  });
});
