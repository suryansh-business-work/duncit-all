/// <reference types="cypress" />
import { EARN_JOURNEYS, type EarnJourney } from '@duncit/onboarding';
import type { CategoryPath } from './pod-ideas-steps';

/**
 * Earn with Duncit (`/earn`, `@duncit/earn`) and the onboarding gate it opens
 * (`/survey/:kind`, pages/survey-gate). Every card is `earn-box-<role>` with
 * its parts derived from that id (packages/earn/docs); the gate's category
 * pickers are `category-step-<level>` with options in a popper as
 * `category-step-<level>-option-<id>`. What a step should show is read from the
 * same queries the gate asks, so the assertions follow staging's data.
 */

export type GateKind = 'HOST' | 'VENUE' | 'ECOMM' | 'CLUB_ADMIN';

export interface GateQuestion {
  qid: string;
  type: 'SECTION' | 'MCQ' | 'TEXT' | 'TEXTAREA';
  label: string;
  required: boolean;
  multi: boolean;
  options: string[];
}

export interface GateSurvey {
  id: string;
  title: string;
  questions: GateQuestion[];
}

/** The card a journey draws (EarnJourneyList passes `earn-box-<role>`). */
export const earnBox = (journey: EarnJourney): string => `earn-box-${journey.role}`;

export function journeyOf(kind: GateKind): EarnJourney {
  const journey = EARN_JOURNEYS.find((candidate) => candidate.kind === kind);
  if (!journey) throw new Error(`No Earn journey is defined for ${kind}.`);
  return journey;
}

/** The journeys /earn lists: all four, without the product seller while products are off. */
export const listedJourneys = (productsOn: boolean): EarnJourney[] =>
  EARN_JOURNEYS.filter((journey) => productsOn || journey.kind !== 'ECOMM');

const EARN_STATE = `query E2eEarnState { me { roles } myMeetings { id kind status } }`;

/** The run account holds no partner role and no onboarding meeting — every card starts open. */
export function expectNoPartnerHistory(): void {
  cy.gql<{ me: { roles: string[] }; myMeetings: Array<{ kind: string }> }>(EARN_STATE).then((data) => {
    expect(data.me.roles, 'the run account is a plain member').to.deep.equal(['USER']);
    expect(data.myMeetings, 'the run account has no onboarding meeting').to.deep.equal([]);
  });
}

/** /earn, once the cards' roles + meetings read has answered. */
export function openEarn(): void {
  cy.interceptOperation('EarnMe');
  cy.visitApp('/earn');
  cy.wait('@EarnMe');
  cy.byTestId('earn-journey-list').should('be.visible');
}

const INTRO = `query E2eEarnIntro {
  onboardingIntro { host_intro_html venue_intro_html ecomm_intro_html club_admin_intro_html }
}`;

const INTRO_FIELD: Record<GateKind, string> = {
  HOST: 'host_intro_html',
  VENUE: 'venue_intro_html',
  ECOMM: 'ecomm_intro_html',
  CLUB_ADMIN: 'club_admin_intro_html',
};

/** Whether the gate opens on the admin-authored intro (gateSteps.ts introFieldFor: a blank field skips it). */
export const hasIntro = (kind: GateKind): Cypress.Chainable<boolean> =>
  cy
    .gql<{ onboardingIntro: Record<string, string | null> | null }>(INTRO)
    .then((data) => Boolean(data.onboardingIntro?.[INTRO_FIELD[kind]]));

/**
 * From /earn, open a journey's card and land on its gate's category picker,
 * walking past the intro when Onboarding > Settings has one for the kind.
 */
export function enterGate(kind: GateKind): void {
  const journey = journeyOf(kind);
  hasIntro(kind).then((intro) => {
    cy.byTestId(`${earnBox(journey)}-open`).click();
    cy.location('pathname').should('eq', journey.surveyPath);
    if (intro) {
      cy.byTestId('survey-gate-intro').should('be.visible');
      cy.byTestId('primary-action').click();
    }
    cy.byTestId('category-step').should('be.visible');
  });
}

/** Open one picker and choose an option by id. */
export function pickLevel(level: 'super' | 'category' | 'sub', id: string): void {
  cy.byTestId(`category-step-${level}`).click();
  cy.byTestId(`category-step-${level}-option-${id}`).click();
}

/** Pick the whole Super › Category › Sub path in the gate. */
export function pickPath(path: Readonly<CategoryPath>): void {
  pickLevel('super', path.superCategory.id);
  pickLevel('category', path.category.id);
  pickLevel('sub', path.sub.id);
}

/** The variables the gate resolves its survey with — the picked path. */
export const surveyVariables = (kind: GateKind, path: Readonly<CategoryPath>) => ({
  kind,
  super_category_id: path.superCategory.id,
  category_id: path.category.id,
  sub_category_id: path.sub.id,
});

const ACTIVE_SURVEY = `query E2eEarnActiveSurvey($kind: SurveyKind!, $super_category_id: ID, $category_id: ID, $sub_category_id: ID) {
  activeSurveyFor(kind: $kind, super_category_id: $super_category_id, category_id: $category_id, sub_category_id: $sub_category_id) {
    id title questions { qid type label required multi options }
  }
}`;

/** The survey the gate will ask for this path, or null when it skips straight to the meeting. */
export const activeSurvey = (kind: GateKind, path: Readonly<CategoryPath>): Cypress.Chainable<GateSurvey | null> =>
  cy
    .gql<{ activeSurveyFor: GateSurvey | null }>(ACTIVE_SURVEY, surveyVariables(kind, path))
    .then((data) => cy.wrap<GateSurvey | null>(data.activeSurveyFor, { log: false }));

/** The stepper's steps (surveySections.ts splitSections): one per SECTION heading, empty ones dropped. */
export function surveySections(questions: readonly GateQuestion[]): GateQuestion[][] {
  const sections: GateQuestion[][] = [];
  let current: GateQuestion[] | null = null;
  for (const question of questions) {
    if (question.type === 'SECTION') {
      current = [];
      sections.push(current);
      continue;
    }
    if (!current) {
      current = [];
      sections.push(current);
    }
    current.push(question);
  }
  return sections.filter((section) => section.length > 0);
}

/** Answer one required question the way a member does. */
function answer(question: GateQuestion, text: string): void {
  if (question.type === 'MCQ') {
    const [first] = question.options;
    if (!first) throw new Error(`Staging prerequisite: required question "${question.label}" offers no options.`);
    cy.byTestId(`opt-${question.qid}-${first}`).click();
    return;
  }
  cy.byTestId(`q-${question.qid}-input`).type(text);
}

/** Fill every required answer, step by step, and submit on the last step. */
export function answerSurvey(survey: GateSurvey, text: string): void {
  const sections = surveySections(survey.questions);
  sections.forEach((section) => {
    section.filter((question) => question.required).forEach((question) => answer(question, text));
    cy.byTestId('primary-action').click();
  });
  if (sections.length === 0) cy.byTestId('primary-action').click();
}

const MEETING_PREREQS = `query E2eEarnMeetingPrereqs($kind: SurveyKind) {
  meetingSlots(kind: $kind) { start_at available }
  me { full_name phone_number }
}`;

export interface MeetingPrereqs {
  /** Every slot the step lists — booked ones show disabled; none at all shows the empty notice. */
  slotCount: number;
  fullName: string;
  phone: string;
}

/** What the meeting step reads: the slots for the kind and the profile's name and phone. */
export const meetingPrereqs = (kind: GateKind): Cypress.Chainable<MeetingPrereqs> =>
  cy
    .gql<{
      meetingSlots: Array<{ available: boolean }>;
      me: { full_name: string | null; phone_number: string | null };
    }>(MEETING_PREREQS, { kind })
    .then((data) => ({
      slotCount: data.meetingSlots.length,
      fullName: data.me.full_name ?? '',
      phone: (data.me.phone_number ?? '').trim(),
    }));
