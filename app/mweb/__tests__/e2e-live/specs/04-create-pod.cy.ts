/// <reference types="cypress" />

import { coverFileName, identity, stamped } from '../support/identity';

/**
 * Create a Pod, against the real server, as the approved host the run signs
 * in as.
 *
 * A PHYSICAL pod on purpose: picking a venue slot is what sets the date and
 * time, so the schedule is a click rather than a typed value in whatever
 * format the admin configured. The cover is a real upload through the media
 * picker — a pod cannot publish without one and the field has no URL input —
 * and the scenarios after the publish reuse that upload through a seeded
 * draft rather than sending the same picture to ImageKit three times.
 *
 * What this needs on staging, for the sign-in account: an approved host
 * profile with a category, a selected city, one active club in that city for
 * that category, and an approved partner venue for the club with at least
 * three open slots — the publish holds one, and the two refusals each need a
 * tile to click before they are refused.
 */

const STEPS = ['Pod Basics', 'Location, Category & Club', 'Venue & Slot', 'Pricing & Publish'];
const podTitle = stamped('Sunset Jazz Session');
const draftTitle = stamped('Draft pod');
const DESCRIPTION =
  'An evening of live jazz with the house band, followed by an open jam for anyone who brings an instrument.';

let coverUrl = '';
let locationId = '';

const ME_LOCATION = `query E2eMeLocation { me { user_id selected_location_id } }`;
const SAVE_DRAFT = `mutation SavePodDraft($draft_id: ID, $input: PodDraftInput!) {
  savePodDraft(draft_id: $draft_id, input: $input) { id }
}`;

const next = () => cy.contains('button', 'Next').click();

/** `exist`, not `be.visible`: a long step clips its own title once it scrolls to the field being filled. */
const onStep = (index: number) => {
  cy.contains(`Step ${index + 1} of 4`).should('exist');
  cy.contains(STEPS[index]).should('exist');
};

/** A host with one category has it picked already; with more, the first is chosen. */
function pickCategory() {
  cy.get('body').then(($body) => {
    const chips = $body
      .find('[data-testid^="create-pod-category-"]')
      .not('[data-testid="create-pod-category-hint"], [data-testid="create-pod-category-empty"]');
    expect(chips.length, 'the host has at least one hosting category').to.be.greaterThan(0);
    if (chips.length > 1) cy.wrap(chips.first()).click();
  });
}

function fillBasics(title: string) {
  onStep(0);
  pickCategory();
  cy.fieldByLabel('Pod title').clear().type(title);
  cy.fieldByLabel('Pod description').clear().type(DESCRIPTION);
  // A chip list: its label is a Typography, so the input is found by placeholder.
  cy.get('input[placeholder="e.g. Coaching, Snacks, Equipment"]').type('Live band{enter}');
}

/** The real thing: device tab, the fixture JPEG, and the one button that uploads on its way out. */
function uploadCover() {
  cy.interceptOperation('UploadImageToImagekit');
  cy.get('[role="button"][aria-label="Upload an image"]').click();
  cy.contains('[role="dialog"]', 'Add pod media').should('be.visible');
  cy.readFile(Cypress.env('COVER_IMAGE'), null).then((contents) => {
    cy.get('[role="dialog"] input[type="file"]').selectFile(
      { contents, fileName: coverFileName(), mimeType: 'image/jpeg' },
      { force: true },
    );
  });
  cy.contains('[role="dialog"] button', 'Use this image').should('be.enabled').click();
  cy.wait('@UploadImageToImagekit', { timeout: 90000 }).then((hit) => {
    coverUrl = hit.response?.body?.data?.uploadImageToImagekit?.url ?? '';
    expect(coverUrl, 'ImageKit answered with the cover URL').to.match(/^https?:\/\//);
  });
  cy.contains('[role="dialog"]', 'Add pod media').should('not.exist');
  cy.get('[aria-label="Remove media"]').should('have.length', 1);
}

function fillLocationAndClub() {
  onStep(1);
  cy.get('[data-testid="create-pod-location-label"]').should('not.contain', 'No location selected');
  cy.pickOption('Club');
}

/** Venue, then the space, then one of that space's open slots — the order the page enforces. */
function bookVenueSlot() {
  onStep(2);
  cy.interceptOperation('CreatePodVenueSlots');
  cy.get('.MuiCardActionArea-root[aria-pressed]').first().click();
  cy.get('[role="combobox"]').click();
  cy.get('[role="listbox"] [role="option"]').first().click();
  cy.wait('@CreatePodVenueSlots');
  cy.get('[data-testid^="slot-tile-"]:not([aria-disabled="true"])').first().click();
  cy.contains('Pod window from slot').should('exist');
}

function fillPricing() {
  onStep(3);
  cy.get('[aria-label="Paid"]').click();
  // Blank on purpose so ₹0 is never assumed; asserted because a price that
  // failed to land leaves Create Pod greyed with nothing saying why.
  cy.get('#create-pod-ticket-price').clear().type('999').should('have.value', '999');
  cy.get('input[aria-label="Agree to Organizer Terms of Service"]').check();
}

/** Create Pod, and the content screening the server runs before writing anything. */
function createPod() {
  cy.interceptOperation('ModeratePodContent');
  cy.contains('button', 'Create Pod').should('be.enabled').click();
  cy.wait('@ModeratePodContent', { timeout: 120000 });
}

/** A draft carrying the published cover, so a walk that ends in a refusal needs no second upload. */
function seedDraftWithCover(title: string) {
  expect(coverUrl, 'the publish scenario uploaded the cover this draft reuses').to.match(/^https?:\/\//);
  const payload = JSON.stringify({ media_text: coverUrl, location_id: locationId });
  return cy
    .gql(SAVE_DRAFT, { draft_id: null, input: { payload, pod_title: title, pod_mode: 'PHYSICAL', step: 0 } })
    .then((data) => data.savePodDraft.id as string);
}

describe('Create a pod', () => {
  const me = identity();

  beforeEach(() => {
    cy.blockThirdParty();
    cy.apiLogin(me.loginEmail, me.password);
  });

  it('opens the four-step stepper for an approved host', () => {
    cy.visitApp('/create-pod');
    cy.contains('Create a Pod').should('be.visible');
    onStep(0);
    cy.contains('Your progress saves automatically').should('be.visible');
  });

  it('will not leave step 1 with the required fields empty', () => {
    cy.visitApp('/create-pod');
    onStep(0);
    next();
    cy.contains('Title is too short').should('be.visible');
    cy.contains(STEPS[1]).should('not.exist');
  });

  it('will not leave step 2 without a club', () => {
    cy.visitApp('/create-pod');
    fillBasics(podTitle);
    next();
    onStep(1);
    next();
    cy.contains('Select a club').should('be.visible');
    cy.contains(STEPS[2]).should('not.exist');
  });

  it('will not leave step 3 without a venue and a slot', () => {
    cy.visitApp('/create-pod');
    fillBasics(podTitle);
    next();
    fillLocationAndClub();
    next();
    onStep(2);
    next();
    cy.contains('Select a venue').should('be.visible');
    cy.contains(STEPS[3]).should('not.exist');
  });

  it('a virtual pod needs a meeting platform, a link and a time window', () => {
    cy.visitApp('/create-pod');
    fillBasics(podTitle);
    next();
    onStep(1);
    cy.contains('button', 'Virtual').click();
    cy.pickOption('Club');
    next();
    cy.contains('Meeting Time & Medium').should('exist');
    next();
    cy.contains('Choose where the meeting happens').should('exist');
    cy.contains('Meeting link is required').should('exist');
    cy.contains('Start date/time required').should('exist');
  });

  it('goes back a step with what was typed still there', () => {
    cy.visitApp('/create-pod');
    fillBasics(podTitle);
    next();
    onStep(1);
    cy.contains('button', 'Back').click();
    onStep(0);
    cy.fieldByLabel('Pod title').should('have.value', podTitle);
  });

  it('autosaves a draft that Host Studio can resume and delete', () => {
    cy.interceptOperation('SavePodDraft');
    cy.visitApp('/create-pod');
    fillBasics(draftTitle);
    // Four seconds after the last change, without pressing anything.
    cy.wait('@SavePodDraft', { timeout: 30000 });

    cy.visitApp('/host/manage');
    cy.contains('Draft pods').should('exist');
    cy.contains('[data-testid^="draft-"]', draftTitle).within(() => {
      cy.contains('button', 'Continue').click();
    });
    cy.location('pathname').should('match', /^\/create-pod\/[a-f0-9]{24}$/);
    cy.fieldByLabel('Pod title').should('have.value', draftTitle);

    cy.visitApp('/host/manage');
    cy.interceptOperation('DeletePodDraft');
    cy.contains('[data-testid^="draft-"]', draftTitle).within(() => {
      cy.get('[aria-label="Delete draft"]').click();
    });
    cy.contains('[role="dialog"]', 'Delete draft?').within(() => {
      cy.contains('button', 'Delete').click();
    });
    cy.wait('@DeletePodDraft');
    cy.contains(draftTitle).should('not.exist');
  });

  it('uploads a cover, books a venue slot and publishes; the venue must approve the slot', () => {
    cy.gql(ME_LOCATION).then((data) => {
      locationId = data.me.selected_location_id ?? '';
      expect(locationId, 'the host account has a selected city').to.not.be.empty;
    });
    cy.visitApp('/create-pod');
    fillBasics(podTitle);
    uploadCover();
    next();
    fillLocationAndClub();
    next();
    bookVenueSlot();
    next();
    fillPricing();
    cy.interceptOperation('PublishPodDraft');
    createPod();
    cy.wait('@PublishPodDraft', { timeout: 60000 });

    // A pod holding a partner venue's slot is not live until the venue says yes.
    cy.location('pathname', { timeout: 30000 }).should('match', /^\/host\/pod-pending\/[a-f0-9]{24}$/);
    cy.contains('Slot Request Sent').should('be.visible');
  });

  it('refuses a second pod with the same title in the same club', () => {
    seedDraftWithCover(podTitle).then((draftId) => {
      cy.visitApp(`/create-pod/${draftId}`);
    });
    fillBasics(podTitle);
    next();
    fillLocationAndClub();
    next();
    bookVenueSlot();
    next();
    fillPricing();
    createPod();
    // The refusal lands on the title field, back on step 1.
    cy.contains('A pod with this title already exists in this club. Choose a different title.').should('exist');
    onStep(0);
  });

  it('blocks a pod whose title carries a phone number, before anything is written', () => {
    const blocked = stamped('Call me on 9876543210 to book');
    seedDraftWithCover(blocked).then((draftId) => {
      cy.visitApp(`/create-pod/${draftId}`);
    });
    fillBasics(blocked);
    next();
    fillLocationAndClub();
    next();
    bookVenueSlot();
    next();
    fillPricing();
    createPod();
    cy.get('[data-testid="moderation-blocked-dialog"]').should('be.visible');
    cy.contains('Remove the phone number — sharing phone numbers is not allowed.').should('exist');
    cy.get('[data-testid="moderation-blocked-close"]').click();
    onStep(0);
    cy.location('pathname').should('match', /^\/create-pod\//);
  });

  it('cancels the pending pod from Host Studio', () => {
    cy.visitApp('/host/manage');
    cy.contains('Requested Pods').should('exist');
    cy.get(`[aria-label="Actions for ${podTitle}"]`).click();
    cy.contains('li', 'Cancel pod').click();
    cy.contains('[role="dialog"]', 'You are cancelling').should('be.visible');
    cy.selectOption('reason_subject', 'Event cancelled');
    cy.fieldByLabel('Note').type('Created by the e2e suite; cancelled by it too.');
    cy.interceptOperation('HostDeletePod');
    cy.contains('[role="dialog"] button', 'Cancel pod').click();
    cy.wait('@HostDeletePod');
    cy.contains('[role="dialog"]', 'You are cancelling').should('not.exist');
    cy.contains(podTitle).should('not.exist');
  });
});
