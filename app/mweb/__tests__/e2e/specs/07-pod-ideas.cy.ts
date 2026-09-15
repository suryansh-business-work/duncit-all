/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { sendCode } from '../support/account-steps';
import { openFromMenu } from '../support/menu-steps';
import {
  approvedIdeaIdsIn,
  fileIdea,
  ideaCategoryPath,
  otherSuperCategory,
  pickCategoryPath,
  pickSuperCategory,
  type CategoryPath,
} from '../support/pod-ideas-steps';
import { runAccount } from '../support/run-account';

/**
 * 07 — Pod Ideas, the member's side, live (stage CHANGED).
 *
 * PI-01..PI-05 are one page, in order: the composer is refused, then files the
 * run's idea — its title carries the run marker, and it is left PENDING for the
 * Pods portal spec to review — and the category filter is walked over it. PI-06
 * deletes a second idea of the account's own, filed through the API for that
 * purpose, so the reviewed one survives.
 *
 * Every Super › Category › Sub the specs pick is read from the server first,
 * and the filter's expectations come from the same approved list the page shows
 * (filtering is client-side: the deepest level picked wins, in both lists).
 */

const IDEA_DESCRIPTION = 'Two courts, loaner paddles and a coach for the first hour, every Saturday at 6:30 am.';

const composer = () => cy.byTestId('idea-composer-dialog');
const composerError = () => cy.byTestId('idea-composer-error');
const toast = () => cy.byTestId('pod-ideas-page-toast');

describe('07 Pod ideas', { testIsolation: false }, () => {
  const account = runAccount();
  const ideaTitle = `${runMarker(account.stamp, 'mweb')} Sunrise pickleball for beginners`;
  // Not the run marker: this idea is deleted here, and the portal spec must never look for it.
  const doomedTitle = `${runMarker(account.stamp, 'mweb-delete')} Night cycling loop`;
  let path: CategoryPath;
  let ideaId = '';

  before(() => {
    cy.apiLogin(account.email, account.password('CHANGED'));
    ideaCategoryPath().then((found) => {
      path = found;
    });
  });

  it('PI-01 Pod Ideas, from the menu, offers Share idea and a category filter', () => {
    cy.interceptOperation('PodIdeas');
    openFromMenu('sidebar-grid-ideas', '/pod-ideas');
    cy.wait('@PodIdeas');
    cy.byTestId('pod-ideas-page').should('be.visible');
    cy.byTestId('pod-ideas-add').should('have.text', 'Share idea');
    cy.byTestId('pod-ideas-page-filter').within(() => {
      cy.byTestId('category-cascade').should('be.visible');
    });
  });

  it('PI-02 Submit is refused with nothing typed, then with no category picked', () => {
    cy.byTestId('pod-ideas-add').click();
    composer().should('be.visible');
    cy.byTestId('idea-composer-submit').should('have.text', 'Submit').click();
    composerError().should('have.text', 'Title and description are both required');
    cy.byTestId('idea-title-input').type(ideaTitle);
    cy.byTestId('idea-description-input').type(IDEA_DESCRIPTION, { delay: 0 });
    cy.byTestId('idea-composer-submit').click();
    composerError().should('have.text', 'Please select a Super Category, Category and Sub Category');
    composer().should('be.visible');
  });

  it('PI-03 with Super › Category › Sub picked, the idea is filed and waits in Your submissions as PENDING', () => {
    pickCategoryPath('idea-composer-dialog', path);
    cy.interceptOperation('CreatePodIdea');
    cy.byTestId('idea-composer-submit').click();
    cy.wait('@CreatePodIdea')
      .its('response.body.data.createPodIdea.id')
      .then((id) => {
        ideaId = String(id);
      });
    composer().should('not.exist');
    toast().should('contain.text', 'Idea submitted! It will appear publicly once approved.');
    cy.byTestId('ideas-list-mine-header-title').should('have.text', 'Your submissions');
    cy.then(() => {
      cy.byTestId('ideas-list-mine').within(() => {
        cy.byTestId(`idea-card-${ideaId}`).should('contain.text', ideaTitle);
        cy.byTestId(`idea-card-status-${ideaId}`).should('have.text', 'PENDING');
      });
    });
  });

  it('PI-04 filtering by its Sub Category keeps it, and the public list shows that sub category’s approved ideas', () => {
    approvedIdeaIdsIn(path.sub.id).then((approvedIds) => {
      pickCategoryPath('pod-ideas-page-filter', path);
      cy.byTestId('ideas-list-mine').within(() => {
        cy.byTestId(`idea-card-${ideaId}`).should('be.visible');
      });
      if (approvedIds.length === 0) {
        cy.byTestId('pod-ideas-empty').should('be.visible');
        return;
      }
      cy.byTestId('ideas-list').within(() => {
        cy.byTestIdPrefix('idea-card-open-').should('have.length', approvedIds.length);
        for (const id of approvedIds) {
          cy.byTestId(`idea-card-${id}`).should('exist');
        }
      });
    });
  });

  it('PI-05 filtering by another Super Category hides it', () => {
    otherSuperCategory(path.superCategory.id).then((other) => {
      if (!other) {
        cy.log('Only one Super Category is active on this server — there is no other to filter by.');
        return;
      }
      pickSuperCategory('pod-ideas-page-filter', other.id);
      cy.byTestId(`idea-card-${ideaId}`).should('not.exist');
    });
  });

  it('PI-06 Delete on an idea of your own asks first; Cancel keeps it and Delete removes it', () => {
    fileIdea(doomedTitle, IDEA_DESCRIPTION, path).then((doomedId) => {
      cy.interceptOperation('PodIdeas');
      cy.visitApp('/pod-ideas');
      cy.wait('@PodIdeas');
      cy.byTestId('ideas-list-mine').within(() => {
        cy.byTestId(`idea-card-${doomedId}`).should('contain.text', doomedTitle);
      });
      cy.byTestId(`idea-card-delete-${doomedId}`).click();
      cy.byTestId('idea-delete-confirm-title').should('have.text', 'Delete this idea?');
      cy.byTestId('idea-delete-confirm-cancel').click();
      cy.byTestId('idea-delete-confirm').should('not.exist');
      cy.byTestId(`idea-card-${doomedId}`).should('exist');
      cy.byTestId(`idea-card-delete-${doomedId}`).click();
      sendCode('DeletePodIdea', () => {
        cy.byTestId('idea-delete-confirm-confirm').should('have.text', 'Delete').click();
      });
      cy.byTestId('idea-delete-confirm').should('not.exist');
      toast().should('contain.text', 'Deleted');
      cy.byTestId(`idea-card-${doomedId}`).should('not.exist');
      cy.byTestId(`idea-card-${ideaId}`).should('contain.text', ideaTitle);
    });
  });
});
