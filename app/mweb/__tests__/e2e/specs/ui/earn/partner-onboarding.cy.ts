/// <reference types="cypress" />
import { ALREADY_ENABLED_LABEL, partnerPortalUrl } from '@duncit/onboarding';
import { runMarker } from '@duncit/utils';
import { revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { openSignedOut } from '../../../support/account-steps';
import {
  activeSurvey,
  answerSurvey,
  earnBox,
  enterGate,
  expectNoPartnerHistory,
  journeyOf,
  listedJourneys,
  meetingPrereqs,
  openEarn,
  pickLevel,
  pickPath,
  surveySections,
  surveyVariables,
  type GateKind,
} from '../../../support/earn-steps';
import { openFromMenu } from '../../../support/menu-steps';
import { ideaCategoryPath, type CategoryPath } from '../../../support/pod-ideas-steps';
import { runAccount } from '../../../support/run-account';
import { declineTracking, expectSignInFor, publicFlag, requireProductsOn } from '../../../support/ui-apps-3';

/**
 * Partner onboarding — Earn with Duncit, live (scenario map › Partner onboarding).
 *
 * /earn draws the four journeys from `EARN_JOURNEYS` (@duncit/onboarding) and
 * locks a card by `earnBoxState`: a held role, a pending onboarding meeting or
 * an application under review. A card opens the gate at its `surveyPath`:
 * the admin intro (skipped when blank), Super › Category › Sub, the survey that
 * path resolves to (skipped when none), then the onboarding slot picker.
 *
 * What is written: only the run account's own survey answers
 * (`submitSurveyResponse`, a SurveyResponse keyed by the member — purged with
 * the account) and, in the approved-role block, a granted ECOMM_MANAGER that
 * `after()` revokes. Booking a slot (`requestMeeting`) reserves a shared
 * staging slot, so every scenario stops at the picker and proves the booking
 * was never sent; the pending/reschedule/cancel/under-review states need that
 * booking (or staff action) and are not driven here.
 */

const HOST: GateKind = 'HOST';
const OTHER_KINDS: Array<{ kind: GateKind; heading: string }> = [
  { kind: 'VENUE', heading: 'Register your venue' },
  { kind: 'ECOMM', heading: 'List your product' },
  { kind: 'CLUB_ADMIN', heading: 'Be a Club Admin' },
];

/** The gate's Back button, and the phase it lands on. */
function backTo(testId: string): void {
  cy.byTestId('gate-header-back').click();
  cy.byTestId(testId).should('be.visible');
}

/** Continue on the category step and check the gate resolved its survey for `path`. */
function continueWith(path: Readonly<CategoryPath>): void {
  cy.interceptOperation('ActiveSurveyFor');
  cy.byTestId('primary-action').click();
  cy.wait('@ActiveSurveyFor').its('request.body.variables').should('deep.equal', surveyVariables(HOST, path));
}

describe('Partner onboarding (plain member)', () => {
  let path: CategoryPath;

  before(() => {
    signInRunMember();
    expectNoPartnerHistory();
    ideaCategoryPath().then((found) => {
      path = found;
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('PO-01 the menu tile opens Earn with Duncit, every journey open for a member with no history', () => {
    publicFlag('is_product_visible').then((productsOn) => {
      cy.interceptOperation('EarnMe');
      openFromMenu('sidebar-grid-earn', '/earn');
      cy.wait('@EarnMe');
      cy.byTestId('earn-page-title').should('have.text', 'Earn with Duncit');
      const journeys = listedJourneys(productsOn);
      cy.byTestIdPrefix('earn-box-', '-open').should('have.length', journeys.length);
      journeys.forEach((journey) => {
        const box = earnBox(journey);
        cy.byTestId(`${box}-title`).should('have.text', journey.title);
        cy.byTestId(`${box}-description`).should('have.text', journey.description);
        cy.byTestId(`${box}-open`).should('be.enabled');
        cy.byTestId(`${box}-enabled`).should('not.exist');
        cy.byTestId(`${box}-cta`).should('not.exist');
        cy.byTestId(`earn-meeting-actions-${journey.kind}`).should('not.exist');
      });
      cy.byTestId(earnBox(journeyOf('ECOMM'))).should(productsOn ? 'exist' : 'not.exist');
    });
  });

  it('PO-02 Become a host opens the gate, which refuses to continue until each category level is picked', () => {
    openEarn();
    enterGate(HOST);
    cy.byTestId('gate-header-title').should('have.text', 'Become a host');
    cy.byTestId('primary-action').should('have.text', 'Continue').click();
    cy.byTestId('category-error').should('have.text', 'Please select a Super Category.');
    pickLevel('super', path.superCategory.id);
    cy.byTestId('category-error').should('not.exist');
    cy.byTestId('primary-action').click();
    cy.byTestId('category-error').should('have.text', 'Please select a Category.');
    pickLevel('category', path.category.id);
    cy.byTestId('primary-action').click();
    cy.byTestId('category-error').should('have.text', 'Please select a Sub-Category.');
  });

  it('PO-03 the host gate walks category and its survey to the slot picker, and a booking needs a slot', () => {
    const account = runAccount();
    activeSurvey(HOST, path).then((survey) => {
      meetingPrereqs(HOST).then((prereqs) => {
        // Counted, not aliased: an alias set inside a handler only exists once
        // a request carries it, so `@RequestMeeting.all` threw exactly when no
        // booking was sent — the case this scenario asserts.
        let meetingRequests = 0;
        cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
          if ((req.body as { operationName?: string } | undefined)?.operationName === 'RequestMeeting') meetingRequests += 1;
        });
        openEarn();
        enterGate(HOST);
        pickPath(path);
        continueWith(path);
        cy.byTestId('category-banner').should(
          'contain.text',
          `${path.superCategory.name} › ${path.category.name} › ${path.sub.name}`,
        );
        if (survey) {
          cy.byTestId('gate-header-title').should('have.text', survey.title || 'Become a host');
          const firstRequired = (surveySections(survey.questions)[0] ?? []).find((question) => question.required);
          if (firstRequired) {
            cy.byTestId('primary-action').click();
            cy.byTestId('survey-stepper-error').should('have.text', `This field is required: ${firstRequired.label}`);
          }
          cy.interceptOperation('SubmitSurveyResponse');
          answerSurvey(survey, `${runMarker(account.stamp, 'mweb')} onboarding answer`);
          cy.wait('@SubmitSurveyResponse');
          // The recap lists only answered questions — here, the required ones.
          const answered = survey.questions.some((question) => question.type !== 'SECTION' && question.required);
          cy.byTestId('submitted-summary').should(answered ? 'be.visible' : 'not.exist');
        }
        cy.byTestId('gate-header-title').should('have.text', 'Book your onboarding meeting');
        if (prereqs.slotCount === 0) {
          cy.byTestId('slots-empty').should('have.text', 'No slots are open right now — please check back soon.');
          return;
        }
        cy.byTestId('meeting-form').should('be.visible');
        cy.byTestId('slot-calendar').should('be.visible');
        cy.byTestId('meeting-phone').should('have.value', prereqs.phone);
        cy.byTestId('meeting-phone-missing').should(prereqs.phone ? 'not.exist' : 'exist');
        if (prereqs.fullName) cy.byTestId('meeting-name').should('have.value', prereqs.fullName).and('be.disabled');
        cy.byTestId('primary-action').should('have.text', 'Book this slot').click();
        cy.byTestId('meeting-form-error').should('have.text', 'Pick an available slot.');
        cy.wrap(null).should(() => expect(meetingRequests, 'RequestMeeting requests sent').to.eq(0));
        cy.byTestId('gate-thanks').should('not.exist');
      });
    });
  });

  it('PO-04 Back steps one phase at a time, and the picked path survives leaving and re-entering the gate', () => {
    activeSurvey(HOST, path).then((survey) => {
      openEarn();
      enterGate(HOST);
      pickPath(path);
      continueWith(path);
      // With a survey Back leaves it for the picker; without one the meeting step's Back does.
      cy.byTestId('gate-header-title').should(
        'have.text',
        survey ? survey.title || 'Become a host' : 'Book your onboarding meeting',
      );
      backTo('category-step');
      cy.byTestId('gate-header-title').should('have.text', 'Become a host');
      // The picker re-opens on the kept path: Continue resolves the same survey.
      continueWith(path);
      backTo('category-step');
      cy.byTestId('gate-header-back').click();
      cy.location('pathname').should('eq', '/earn');
      cy.byTestId(`${earnBox(journeyOf(HOST))}-open`).click();
      cy.location('pathname').should('eq', journeyOf(HOST).surveyPath);
      cy.byTestId('survey-gate-intro').should('not.exist');
      cy.byTestId('category-step').should('be.visible');
      continueWith(path);
    });
  });

  OTHER_KINDS.forEach(({ kind, heading }, index) => {
    it(`PO-0${index + 5} the ${kind} card opens its own gate headed "${heading}"`, () => {
      publicFlag('is_product_visible').then((productsOn) => {
        const journey = journeyOf(kind);
        if (kind === 'ECOMM' && !productsOn) {
          // The product-seller journey does not exist with products off: no card, and its gate sends members away.
          openEarn();
          cy.byTestId(earnBox(journey)).should('not.exist');
          cy.visitApp(journey.surveyPath);
          cy.location('pathname').should('eq', '/hosts-venues');
          return;
        }
        openEarn();
        enterGate(kind);
        cy.byTestId('gate-header-title').should('have.text', heading);
        cy.byTestId('category-step-super').should('be.visible');
      });
    });
  });

  it('PO-08 an unknown journey in the gate link sends the member to Hosts & Venues', () => {
    cy.visitApp('/survey/e2e-not-a-journey');
    cy.location('pathname').should('eq', '/hosts-venues');
    cy.byTestId('hosts-venues-screen').should('be.visible');
    cy.byTestId('survey-gate-page').should('not.exist');
  });

  (['/become-host', '/register-venue'] as const).forEach((legacy, index) => {
    it(`PO-${String(index + 9).padStart(2, '0')} ${legacy} hands the member to the Partner Portal's ${legacy}`, () => {
      cy.intercept(partnerPortalUrl(legacy), { statusCode: 200, headers: { 'content-type': 'text/html' }, body: '' }).as(
        'partnerPortal',
      );
      cy.visitApp(legacy);
      cy.wait('@partnerPortal').its('request.url').should('eq', partnerPortalUrl(legacy));
    });
  });

  it('PO-11 signed out, /earn and a gate link ask the visitor to sign in first', () => {
    openSignedOut('/earn');
    expectSignInFor('/earn');
    openSignedOut('/survey/host');
    expectSignInFor('/survey/host');
  });
});

describe('Partner onboarding (approved product seller)', () => {
  const ROLES = ['ECOMM_MANAGER'] as const;

  before(() => {
    requireProductsOn();
    signInRunAs(ROLES);
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  beforeEach(() => {
    declineTracking();
  });

  it('PO-12 a held role locks its card as Already enabled with a next step that opens the Partner Portal', () => {
    const ecomm = journeyOf('ECOMM');
    const box = earnBox(ecomm);
    if (ecomm.cta.target !== 'partner') throw new Error('The product-seller next step is expected on the Partner Portal.');
    const target = partnerPortalUrl(ecomm.cta.partnerPath);
    cy.intercept(target, { statusCode: 200, headers: { 'content-type': 'text/html' }, body: '' }).as('partnerPortal');
    openEarn();
    cy.byTestId(`${box}-open`).should('be.disabled');
    cy.byTestId(`${box}-enabled`).should('have.text', ALREADY_ENABLED_LABEL);
    cy.byTestId(`${box}-cta`).should('have.text', ecomm.cta.label);
    listedJourneys(true)
      .filter((journey) => journey.kind !== 'ECOMM')
      .forEach((journey) => cy.byTestId(`${earnBox(journey)}-open`).should('be.enabled'));
    cy.byTestId(`${box}-cta`).click();
    cy.wait('@partnerPortal').its('request.url').should('eq', target);
  });
});
