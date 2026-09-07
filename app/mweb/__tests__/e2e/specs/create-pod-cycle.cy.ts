/// <reference types="cypress" />

import { createPodCycleFixtures } from '../support/data';

/**
 * Create a Pod, all four steps, end to end.
 *
 * The gate and the draft are covered in `create-pod.cy.ts`; this is the walk —
 * Basics → Location/Category/Club → Venue & Slot → Pricing & Publish — and the
 * two things only a full walk can reach: the content screening that runs before
 * a pod is written, and where the host lands afterwards.
 *
 * A PHYSICAL pod on purpose. It is the default mode and the one that books a
 * real venue slot, and picking that slot is what sets the pod's date and time —
 * so the schedule is a click rather than a hand-typed value, which is both the
 * way a host actually does it and the only way to drive it without depending on
 * the admin-configured date format.
 */

const STEPS = ['Pod Basics', 'Location, Category & Club', 'Venue & Slot', 'Pricing & Publish'];

const nextStep = () => cy.contains('button', 'Next').click();

/**
 * Open the stepper on the draft that carries the pod's cover image.
 *
 * A publish needs one and the cover field is an upload widget, so a walk that
 * ends in a published pod has to start from a draft. The step-validation tests
 * below need no cover and open `/create-pod` directly.
 */
const openWithCover = () => cy.visitApp('/create-pod/draft1');

/**
 * Assert which step is open.
 *
 * `exist`, not `be.visible`: a step long enough to scroll — step 4 is — leaves
 * its own title clipped by the scroll container once the page settles at the
 * field being filled, and Cypress reads a clipped element as not visible. The
 * title being in the DOM is what "we are on this step" means here.
 */
const onStep = (index: number) => cy.contains(STEPS[index]).should('exist');

/** Step 1 — the three fields the schema will not let past: a title, a
 * description of at least ten characters, and one "what this pod offers" chip.
 * The category picks itself, because this host has exactly one. */
function fillBasics() {
  onStep(0);
  cy.fieldByLabel('Pod title').type('Sunset Jazz Session');
  cy.fieldByLabel('Pod description').type('An evening of live jazz with the house band.');
  // A chip list. Its label is a Typography, not a bound <label>, so the input
  // is found by its placeholder — and the value is committed on Enter.
  cy.get('input[placeholder="e.g. Coaching, Snacks, Equipment"]').type('Live band{enter}');
}

/** Step 2 — the city is already the host's selected one, so this is the mode
 * and the club the pod belongs to. */
function fillLocationAndClub() {
  onStep(1);
  cy.fieldByLabel('Club').click();
  cy.contains('.MuiAutocomplete-option', 'Jazz Club').click();
}

/** Step 3 — venue, then the space, then one of that space's published slots.
 * The order is enforced by the page: no space until a venue, no slots until a
 * space, because a slot's price belongs to a capacity. */
function bookVenueSlot() {
  onStep(2);
  cy.get('[aria-label="Indiranagar Studio"]').click();
  // The space is the only select on this step; targeting the role avoids
  // depending on how the required marker is composed into its label.
  cy.get('[role="combobox"]').click();
  cy.contains('[role="option"]', 'Main Hall').click();
  cy.get('[data-testid="slot-tile-slot1"]').click();
}

/** Step 4 — the ticket price and the terms. Spots arrived with the space. */
function fillPricing(amount = '350') {
  onStep(3);
  cy.contains('button', 'Paid').click();
  // A physical pod is always PAID (Free is disabled), and the price field starts
  // BLANK on purpose so ₹0 is never assumed — Create Pod stays disabled until a
  // price is typed. Asserted rather than assumed: a price that failed to land
  // leaves the button greyed with nothing saying which field is at fault.
  cy.get('#create-pod-ticket-price').type(`{selectall}${amount}`).should('have.value', amount);
  cy.get('input[aria-label="Agree to Organizer Terms of Service"]').check();
}

describe('Create a pod · the full cycle', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
  });

  it('walks all four steps and publishes, landing on the waiting page', () => {
    cy.mockGraphql(createPodCycleFixtures());
    openWithCover();

    fillBasics();
    nextStep();
    fillLocationAndClub();
    nextStep();
    bookVenueSlot();
    nextStep();
    fillPricing();

    cy.contains('button', 'Create Pod').click();

    // A pod holding a venue slot is not live until the venue says yes, so the
    // host lands on the page that says so rather than on Host Management.
    cy.location('pathname').should('eq', '/host/pod-pending/pod-new');
  });

  it('lands on Host Management when the venue needs no approval', () => {
    cy.mockGraphql(createPodCycleFixtures({ venueApproval: 'APPROVED' }));
    openWithCover();

    fillBasics();
    nextStep();
    fillLocationAndClub();
    nextStep();
    bookVenueSlot();
    nextStep();
    fillPricing();

    cy.contains('button', 'Create Pod').click();
    cy.location('pathname').should('eq', '/host/manage');
  });

  // Every step validates its own fields before letting go, so a host is told
  // what is missing where they typed it — not after filling in the whole pod.
  it('will not leave step 1 with the required fields empty', () => {
    cy.mockGraphql(createPodCycleFixtures());
    cy.visitApp('/create-pod');

    onStep(0);
    nextStep();

    cy.contains('Title is too short').should('be.visible');
    cy.contains(STEPS[1]).should('not.exist');
  });

  it('will not leave step 2 without a club', () => {
    cy.mockGraphql(createPodCycleFixtures());
    cy.visitApp('/create-pod');

    fillBasics();
    nextStep();
    onStep(1);
    nextStep();

    cy.contains('Select a club').should('be.visible');
    cy.contains(STEPS[2]).should('not.exist');
  });

  it('will not leave step 3 without a venue and a slot', () => {
    cy.mockGraphql(createPodCycleFixtures());
    cy.visitApp('/create-pod');

    fillBasics();
    nextStep();
    fillLocationAndClub();
    nextStep();
    onStep(2);
    nextStep();

    cy.contains(STEPS[3]).should('not.exist');
  });

  it('goes back a step with what was typed still there', () => {
    cy.mockGraphql(createPodCycleFixtures());
    cy.visitApp('/create-pod');

    fillBasics();
    nextStep();
    onStep(1);

    cy.contains('button', 'Back').click();
    onStep(0);
    cy.fieldByLabel('Pod title').should('have.value', 'Sunset Jazz Session');
  });

  // The screening runs BEFORE anything is written, and a refusal has to land
  // the host on the step carrying the offending field with the reason on it —
  // a bare "blocked" would leave them hunting through four steps.
  it('sends a blocked pod back to the step that broke the rules', () => {
    cy.mockGraphql(
      createPodCycleFixtures({
        violations: [
          {
            field: 'pod_title',
            step: 'BASICS',
            type: 'PROFANITY',
            message: 'That title breaks the pod guidelines.',
            evidence: 'pod_title',
          },
        ],
      }),
    );
    openWithCover();

    fillBasics();
    nextStep();
    fillLocationAndClub();
    nextStep();
    bookVenueSlot();
    nextStep();
    fillPricing();

    cy.contains('button', 'Create Pod').click();

    // The reason lands as the title field's own helper text — `exist` for the
    // same reason `onStep` uses it: jumping back scrolls the step and clips it.
    cy.contains('That title breaks the pod guidelines.').should('exist');
    // Back on step 1, and nothing was published — still on the draft.
    onStep(0);
    cy.location('pathname').should('eq', '/create-pod/draft1');
  });
});
