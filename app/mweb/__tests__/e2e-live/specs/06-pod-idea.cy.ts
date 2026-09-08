/// <reference types="cypress" />

import { identity, stamped } from '../support/identity';

/**
 * Pod ideas, against the real server: share one, talk about it, like it,
 * and take it down again — the one flow here whose author can delete what
 * they made, so the last scenario is the cleanup and the purge only ever
 * finds an idea when a scenario before it failed.
 */

const title = stamped('Sunrise rooftop yoga for beginners');
const comment = 'Would love a weekend edition of this.';

const card = () => cy.contains('.MuiCard-root', title);

/**
 * Each category level loads only once the level above is picked, so the pick
 * waits for the server's list before opening the next box.
 */
function pickCategories() {
  cy.interceptOperation('SurveyGateCategories', (v) => v.level === 'CATEGORY', 'CategoryLevel');
  cy.interceptOperation('SurveyGateCategories', (v) => v.level === 'SUB', 'SubLevel');
  cy.pickOption(/^Super Category/);
  cy.wait('@CategoryLevel');
  cy.pickOption(/^Category/);
  cy.wait('@SubLevel');
  cy.pickOption(/^Sub Category/);
}

function openComposer() {
  cy.visitApp('/pod-ideas');
  cy.contains('button', 'Share idea').click();
  cy.contains('[role="dialog"]', 'Share a pod idea').should('be.visible');
}

describe('Pod idea', () => {
  const me = identity();

  beforeEach(() => {
    cy.blockThirdParty();
    cy.apiLogin(me.loginEmail, me.password);
  });

  it('opens the composer from the Pod Ideas page', () => {
    openComposer();
    cy.contains('label', 'Title').should('be.visible');
    cy.contains('label', 'Description').should('be.visible');
    cy.contains('label', 'Super Category').should('be.visible');
  });

  it('refuses an idea without a title and a description', () => {
    openComposer();
    cy.contains('[role="dialog"] button', 'Submit').click();
    cy.contains('Title and description are both required').should('be.visible');
  });

  it('refuses an idea without its three category levels', () => {
    openComposer();
    cy.fieldByLabel('Title').type(title);
    cy.fieldByLabel('Description').type('Gentle flow on the terrace as the sun comes up.');
    cy.contains('[role="dialog"] button', 'Submit').click();
    cy.contains('Please select a Super Category, Category and Sub Category').should('be.visible');
  });

  it('submits an idea, which waits for approval under Your submissions', () => {
    openComposer();
    cy.fieldByLabel('Title').type(title);
    cy.fieldByLabel('Description').type(
      'Gentle flow on the terrace as the sun comes up, mats provided, chai afterwards.',
    );
    pickCategories();
    cy.interceptOperation('CreatePodIdea');
    cy.contains('[role="dialog"] button', 'Submit').click();
    cy.wait('@CreatePodIdea');
    cy.contains('Idea submitted! It will appear publicly once approved.').should('be.visible');

    // Pending ideas never join the public list — they wait under the author's own.
    cy.contains('Your submissions').should('exist');
    card().should('exist');
    card().contains('.MuiChip-root', 'PENDING').should('exist');
    card().contains(/DUN-\d{6}/).should('exist');
  });

  it('opens the idea and adds a comment', () => {
    cy.visitApp('/pod-ideas');
    card().contains('h6', title).click();
    cy.contains('[role="dialog"]', title).should('be.visible');
    cy.interceptOperation('AddPodIdeaComment');
    cy.get('[role="dialog"] input[placeholder^="Add a comment"]').type(`${comment}{enter}`);
    cy.wait('@AddPodIdeaComment');
    cy.contains('[role="dialog"]', comment).should('be.visible');
    cy.contains('[role="dialog"]', 'Comments (1)').should('exist');
  });

  it('deletes the comment again', () => {
    cy.visitApp('/pod-ideas');
    card().contains('h6', title).click();
    cy.contains('[role="dialog"]', comment).should('be.visible');
    cy.interceptOperation('DeletePodIdeaComment');
    cy.contains('.MuiStack-root', comment).find('button').click();
    cy.wait('@DeletePodIdeaComment');
    cy.contains('[role="dialog"]', 'No comments yet — be the first.').should('be.visible');
  });

  it('likes the idea', () => {
    cy.visitApp('/pod-ideas');
    cy.interceptOperation('TogglePodIdeaLike');
    // The like, comment and share buttons read their counts; the like is the first.
    card().contains('button', /^0$/).first().click();
    cy.wait('@TogglePodIdeaLike');
    card().contains('button', /^1$/).should('exist');
  });

  it('deletes the idea, with everything under it', () => {
    cy.visitApp('/pod-ideas');
    card().find('button[aria-label="Delete"]').click();
    cy.interceptOperation('DeletePodIdea');
    cy.contains('[role="dialog"]', 'Delete this idea?').within(() => {
      cy.contains('This will permanently remove the idea, its likes, and all comments.').should('be.visible');
      cy.contains('button', 'Delete').click();
    });
    cy.wait('@DeletePodIdea');
    cy.contains('Deleted').should('be.visible');
    cy.contains('.MuiCard-root', title).should('not.exist');
  });
});
