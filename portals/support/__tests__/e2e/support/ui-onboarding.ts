import type { RunAccount } from './run-account';
import { IDEA_CATEGORIES } from './operations';
import { grantRoles, revokeRoles, staffAccount, wideViewport } from './ui-staff';

/**
 * Shared steps for the Onboarding console specs (specs/onboarding/).
 *
 * The run account is a plain member plus the three staff roles the numbered
 * specs grant; each Onboarding spec adds ONBOARDING_MANAGER — the one role the
 * portal admits (portal.constants.ts, `onboarding: ['ONBOARDING_MANAGER']`) —
 * in `before()` and takes it away again in `after()`.
 *
 * What the console shows here belongs to real applicants: their meetings,
 * applications and the shared meeting availability. The specs only READ them,
 * open a decision dialog and stop at its validation. The one thing a spec
 * writes is its own survey, filed inactive on a category slot no survey uses
 * and named with the run's marker, so no applicant ever sees it.
 */

export const ONBOARDING_ROLE = 'ONBOARDING_MANAGER' as const;

/** The run account, holding the staff roles and ONBOARDING_MANAGER. */
export function onboardingAccount(): RunAccount {
  const account = staffAccount();
  grantRoles(account, [ONBOARDING_ROLE]);
  return account;
}

/** Hand the account back without the Onboarding role. */
export function releaseOnboarding(account: RunAccount | undefined): void {
  if (account) revokeRoles(account, [ONBOARDING_ROLE]);
}

/** A real password sign-in to the Onboarding console; the next `visitPortal` carries it. */
export function signInOnboarding(account: RunAccount): Cypress.Chainable<string> {
  return cy.apiPortalLogin('onboarding', account.email, account.password('CHANGED'));
}

// ------------------------------------------------------------ Product flag

const PUBLIC_FLAGS = `query E2eOnboardingPublicFlags { publicFeatureFlags { key enabled } }`;

/**
 * Whether `is_product_visible` is on in staging. The brand console, the brand
 * meeting queue and the brand dashboard segment exist only while it is on; the
 * specs assert whichever side staging is on and never flip the flag.
 */
export function productsVisible(): Cypress.Chainable<boolean> {
  return cy
    .gql<{ publicFeatureFlags: { key: string; enabled: boolean }[] }>(PUBLIC_FLAGS)
    .then(({ publicFeatureFlags }) => publicFeatureFlags.some((f) => f.key === 'is_product_visible' && f.enabled));
}

// ------------------------------------------------------------ Meetings

export type MeetingKind = 'VENUE' | 'HOST' | 'ECOMM' | 'CLUB_ADMIN';
export type MeetingStatus = 'REQUESTED' | 'SCHEDULED' | 'DONE' | 'CANCELLED';

export interface MeetingRow {
  id: string;
  request_no: string | null;
  kind: MeetingKind;
  status: MeetingStatus;
  approval_status: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED' | null;
  cancelled_by_staff: boolean | null;
  dismissed: boolean | null;
  cancel_reason: string | null;
  user_name: string | null;
  contact_name: string | null;
  meeting_link: string | null;
  requested_at: string;
  scheduled_at: string | null;
}

const MEETING_FIELDS = `id request_no kind status approval_status cancelled_by_staff dismissed cancel_reason
  user_name contact_name meeting_link requested_at scheduled_at`;

const MEETINGS_LOOKUP = `query E2eOnboardingMeetings($query: TableQueryInput) {
  onboardingMeetingsTable(query: $query) { total rows { ${MEETING_FIELDS} } }
}`;

/** `/meetings/<slug>` — MeetingSchedulePage upper-cases the slug into the kind. */
export const meetingPath = (kind: MeetingKind): string => `/meetings/${kind.toLowerCase()}`;

/** A server-side filter on one field, as the table engine takes it. */
export const eq = (field: string, value: string) => ({ field, op: 'eq', value });

/**
 * The newest-scheduled meeting matching every filter that carries a request
 * number (the only way to search one onto the screen). Fails with `why` when
 * staging holds none — a missing applicant must read as missing, never pass.
 */
export function findMeeting(filters: object[], why: string): Cypress.Chainable<MeetingRow> {
  return cy
    .gql<{ onboardingMeetingsTable: { rows: MeetingRow[] } }>(MEETINGS_LOOKUP, {
      query: { page: 1, page_size: 50, filters },
    })
    .then(({ onboardingMeetingsTable }) => {
      const row = onboardingMeetingsTable.rows.find((r) => !!r.request_no);
      if (!row) throw new Error(`Staging holds no onboarding meeting that is ${why}.`);
      return row;
    });
}

/** The meeting queue for the row's kind, wide, searched down to that one row. */
export function openMeetingRow(row: MeetingRow): void {
  wideViewport();
  cy.interceptOperation('OnboardingMeetingsTable');
  cy.visitPortal('onboarding', meetingPath(row.kind));
  cy.wait('@OnboardingMeetingsTable');
  cy.byTestId('table-toolbar-search').should('be.enabled').type(String(row.request_no), { delay: 0 });
  cy.wait('@OnboardingMeetingsTable');
  cy.byTestId(`onboarding-meetings-row-${row.id}`).should('contain.text', String(row.request_no));
}

/** Open the row's Meeting actions menu. */
export function openMeetingActions(row: MeetingRow): void {
  cy.byTestId(`onboarding-meetings-row-${row.id}`).within(() => cy.byTestId(`meeting-actions-${row.id}`).click());
}

// ------------------------------------------------------------ Surveys

interface CategoryNode {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CategoryTree {
  supers: CategoryNode[];
  categories: CategoryNode[];
  subs: CategoryNode[];
}

/** A full Super › Category › Sub path of the admin taxonomy. */
export interface SurveySlot {
  super: CategoryNode;
  category: CategoryNode;
  sub: CategoryNode;
}

const SURVEYS_OF_KIND = `query E2eOnboardingSurveys($kind: SurveyKind) {
  surveys(kind: $kind) { id title sub_category_id }
}`;

const CREATE_SURVEY = `mutation E2eOnboardingCreateSurvey($input: CreateSurveyInput!) {
  createSurvey(input: $input) { id title is_active }
}`;

const DELETE_SURVEY = `mutation E2eOnboardingDeleteSurvey($id: ID!) { deleteSurvey(id: $id) }`;

/**
 * A Sub category no survey of `kind` is scoped to yet — surveys are unique per
 * kind + slot, so a run never collides with (or edits) a real one.
 */
export function freeSurveySlot(kind: MeetingKind): Cypress.Chainable<SurveySlot> {
  return cy.gql<CategoryTree>(IDEA_CATEGORIES).then((tree) =>
    cy
      .gql<{ surveys: { sub_category_id: string | null }[] }>(SURVEYS_OF_KIND, { kind })
      .then(({ surveys }) => {
        const taken = new Set(surveys.map((s) => s.sub_category_id).filter(Boolean));
        for (const sub of tree.subs) {
          const category = tree.categories.find((c) => c.id === sub.parent_id);
          const top = category && tree.supers.find((s) => s.id === category.parent_id);
          if (category && top && !taken.has(sub.id)) return { super: top, category, sub };
        }
        throw new Error(`Every Sub category already has a ${kind} survey — no free slot for the run's own survey.`);
      }),
  );
}

/** File the run's own survey: inactive (no applicant is ever shown it), one short-text question. */
export function createRunSurvey(kind: MeetingKind, slot: SurveySlot, title: string): Cypress.Chainable<string> {
  return cy
    .gql<{ createSurvey: { id: string; is_active: boolean } }>(CREATE_SURVEY, {
      input: {
        kind,
        super_category_id: slot.super.id,
        category_id: slot.category.id,
        sub_category_id: slot.sub.id,
        title,
        is_active: false,
        questions: [{ type: 'TEXT', label: 'What brings you here?', required: false, multi: false, options: [] }],
      },
    })
    .then(({ createSurvey }) => {
      expect(createSurvey.is_active, 'the run survey is filed inactive').to.equal(false);
      return createSurvey.id;
    });
}

/** Remove every survey of `kind` whose title carries the marker. */
export function deleteMarkedSurveys(kind: MeetingKind, marker: string): void {
  cy.gql<{ surveys: { id: string; title: string }[] }>(SURVEYS_OF_KIND, { kind }).then(({ surveys }) => {
    for (const survey of surveys.filter((s) => s.title.includes(marker))) {
      cy.gql(DELETE_SURVEY, { id: survey.id });
    }
  });
}

/** `scopeLabel` in SurveysTable.tsx. */
export const scopePath = (slot: SurveySlot): string => [slot.super.name, slot.category.name, slot.sub.name].join(' › ');

// ------------------------------------------------------------ Tables

/** The first row a table page received, failing with `why` when it answered none. */
export function firstRow<T>(operation: string, field: string, why: string): Cypress.Chainable<T> {
  return cy.wait(`@${operation}`).then(({ response }) => {
    const rows = (response?.body.data?.[field]?.rows ?? []) as T[];
    if (rows.length === 0) throw new Error(`Staging lists no ${why}.`);
    return cy.wrap(rows[0], { log: false });
  });
}
