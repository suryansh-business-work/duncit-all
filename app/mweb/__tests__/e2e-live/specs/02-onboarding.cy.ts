/// <reference types="cypress" />

import { identity, marker } from '../support/identity';

/**
 * Onboarding, against the real server: a member with no role applies to host
 * from Earn — category, the server-defined survey when there is one, then an
 * onboarding slot — and can cancel the meeting again.
 *
 * Runs as the account the signup spec created, because the sign-in account is
 * already an approved host and the platform refuses a second application.
 * The meeting is soft-cancelled by the member here; the account itself, and
 * the meeting rows with it, go with the purge at the end of the leg.
 */

/** The card and, beneath it, the reschedule/cancel row a booked meeting adds. */
const hostJourney = () => cy.contains('.MuiCard-root', 'By hosting a pod').parent();

/**
 * Super Category, then Category and Sub-Category when the level above has
 * children. Each level is loaded from the server once its parent is picked,
 * and the page marks a level that has options with `*` — so the pick waits
 * for the server's list and then reads the label to know whether to go on.
 */
function pickCategoryCascade() {
  cy.interceptOperation('SurveyGateCategories', (v) => v.level === 'CATEGORY', 'CategoryLevel');
  cy.interceptOperation('SurveyGateCategories', (v) => v.level === 'SUB', 'SubLevel');
  cy.pickOption(/^Super Category/);
  cy.wait('@CategoryLevel').then((hit) => {
    const rows: Array<{ is_active?: boolean }> = hit.response?.body?.data?.categories ?? [];
    if (rows.filter((r) => r.is_active !== false).length === 0) return;
    cy.pickOption(/^Category/);
    cy.wait('@SubLevel').then((sub) => {
      const subs: Array<{ is_active?: boolean }> = sub.response?.body?.data?.categories ?? [];
      if (subs.filter((r) => r.is_active !== false).length === 0) return;
      cy.pickOption(/^Sub-Category/);
    });
  });
}

/** Fill every question on the section that is showing: first choice for a choice, a sentence for text. */
function answerVisibleQuestions() {
  cy.get('body').then(($body) => {
    const groups = new Set<string>();
    $body.find('input[type="radio"]').each((_, el) => {
      const name = el.getAttribute('name') ?? '';
      if (groups.has(name)) return;
      groups.add(name);
      cy.wrap(el).check({ force: true });
    });
    $body.find('.MuiFormGroup-root').each((_, group) => {
      const first = group.querySelector('input[type="checkbox"]');
      if (first) cy.wrap(first).check({ force: true });
    });
    $body
      .find('.MuiTextField-root input:not([type="radio"]):not([type="checkbox"]), .MuiTextField-root textarea:not([aria-hidden="true"])')
      .each((_, el) => {
        cy.wrap(el).type('Yes — happy to go through the details on the call.');
      });
  });
}

/**
 * The survey step, section by section, until the meeting step shows. A
 * category with no survey skips straight to the meeting, so this may do
 * nothing at all. Bounded: a survey has a handful of sections, not dozens.
 */
function answerSurveyUntilMeeting(depth = 0) {
  expect(depth, 'the survey ends within a few sections').to.be.lessThan(8);
  cy.contains(/A few quick questions before you continue\.|Book your onboarding meeting/).then(($heading) => {
    if (($heading?.text() ?? '').includes('Book your onboarding meeting')) return;
    answerVisibleQuestions();
    // Next on a middle section, the submit on the last — the one contained button.
    cy.get('button.MuiButton-contained').last().click();
    answerSurveyUntilMeeting(depth + 1);
  });
}

function bookFirstSlot() {
  cy.contains('Book your onboarding meeting').should('be.visible');
  cy.get('[data-testid="slot-calendar"]').should('exist');
  cy.get('[data-testid^="slot-tile-"]:not([aria-disabled="true"])').first().click();
  cy.fieldByLabel('Anything we should know? (optional)').type(`Applying through the e2e suite ${marker()}`);
  cy.interceptOperation('RequestMeeting');
  cy.contains('button', 'Book this slot').click();
  cy.wait('@RequestMeeting');
}

describe('Onboarding', () => {
  const me = identity();

  beforeEach(() => {
    cy.blockThirdParty();
    cy.apiLogin(me.signupEmail, me.password);
  });

  it('Earn lists the ways a member can start earning', () => {
    cy.visitApp('/earn');
    cy.contains('Earn with Duncit').should('be.visible');
    cy.contains('.MuiCard-root', 'By hosting a pod').should('be.visible');
    cy.contains('.MuiCard-root', 'By registering your venue').should('be.visible');
    cy.contains('.MuiCard-root', 'By managing a club').should('be.visible');
  });

  it('a member without a host profile is sent to become a host instead of the pod stepper', () => {
    cy.visitApp('/create-pod');
    cy.contains('An approved host profile is required before creating pods.').should('be.visible');
    cy.contains('button', 'Become a host').should('be.visible');
  });

  it('the host application needs a category before it goes on', () => {
    cy.visitApp('/survey/host');
    cy.contains('Become a host').should('be.visible');
    cy.contains('Tell us your category so we can ask the right questions.').should('be.visible');
    cy.contains('button', 'Continue').click();
    cy.contains('Please select a Super Category.').should('be.visible');
  });

  it('applies to host: picks a category, answers the survey and books an onboarding slot', () => {
    cy.visitApp('/earn');
    cy.contains('.MuiCard-root', 'By hosting a pod').click();
    cy.location('pathname').should('eq', '/survey/host');
    pickCategoryCascade();
    cy.contains('button', 'Continue').click();
    answerSurveyUntilMeeting();
    bookFirstSlot();

    cy.contains('You’re booked!').should('be.visible');
    cy.contains('Thank you for your submission! Your onboarding meeting is booked for').should('be.visible');
    cy.contains('button', 'Back to Home').click();
    cy.location('pathname').should('eq', '/');
  });

  it('Earn shows the booked meeting and locks the host card until it is done', () => {
    cy.visitApp('/earn');
    cy.contains('.MuiCard-root', 'By hosting a pod').within(() => {
      cy.contains('Meeting scheduled').should('be.visible');
      cy.contains(/You already have an onboarding meeting \(Request ID: DUN-HOST-\d+\)/).should('be.visible');
    });
    hostJourney().within(() => {
      cy.contains('button', 'Reschedule meeting').should('be.visible');
      cy.contains('button', 'Cancel meeting').should('be.visible');
    });
  });

  it('will not cancel the meeting without a reason', () => {
    cy.visitApp('/earn');
    hostJourney().contains('button', 'Cancel meeting').click();
    cy.contains('[role="dialog"]', 'Cancel this meeting?').within(() => {
      cy.contains('button', 'Cancel meeting').click();
      cy.contains('Please tell us a reason.').should('be.visible');
      cy.contains('button', 'Keep meeting').click();
    });
    cy.contains('[role="dialog"]', 'Cancel this meeting?').should('not.exist');
  });

  it('cancels the meeting with a reason, which reopens the host card', () => {
    cy.visitApp('/earn');
    hostJourney().contains('button', 'Cancel meeting').click();
    cy.interceptOperation('CancelMyMeeting');
    cy.contains('[role="dialog"]', 'Cancel this meeting?').within(() => {
      cy.get('textarea[name="reason"]').type(
        `Work travel came up that week, I will book again once I am back ${marker()}`,
      );
      cy.contains('button', 'Cancel meeting').click();
    });
    cy.wait('@CancelMyMeeting');
    cy.contains('[role="dialog"]', 'Cancel this meeting?').should('not.exist');
    cy.contains('.MuiCard-root', 'By hosting a pod').within(() => {
      cy.contains('Meeting scheduled').should('not.exist');
    });
    hostJourney().contains('button', 'Cancel meeting').should('not.exist');
  });
});
