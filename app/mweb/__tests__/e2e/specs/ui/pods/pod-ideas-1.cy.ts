/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';
import { stubShareSheet } from '../../../support/ui-apps-1';

/**
 * Pod ideas — engaging with an idea from its card, live on staging, on the
 * idea the run account filed in 07 (still PENDING, in "Your submissions"), so
 * no other member's idea is liked or has its share count moved. The like is
 * taken back before the scenario ends.
 */

const MY_IDEAS_QUERY = `query E2eMyIdeas($filter: PodIdeaFilterInput) {
  podIdeas(filter: $filter) { id title description likes_count shares_count liked_by_me }
}`;
const ME_QUERY = `query E2eIdeaAuthor { me { user_id } }`;

interface Idea {
  id: string;
  title: string;
  description: string;
  likes_count: number;
  shares_count: number;
  liked_by_me: boolean;
}

function openPodIdeas(): void {
  cy.interceptOperation('PodIdeas');
  cy.visitApp('/pod-ideas');
  cy.wait('@PodIdeas');
  cy.byTestId('ideas-list-mine').should('be.visible');
}

describe('UI Pod ideas (1)', () => {
  const marker = runMarker(runAccount().stamp, 'mweb');
  let idea: Idea;

  before(() => {
    signInRunMember();
    cy.gql<{ me: { user_id: string } }>(ME_QUERY).then(({ me }) => {
      cy.gql<{ podIdeas: Idea[] }>(MY_IDEAS_QUERY, { filter: { author_id: me.user_id } }).then((data) => {
        const found = data.podIdeas.find((row) => row.title.startsWith(marker));
        if (!found) throw new Error(`The run account has no idea titled "${marker} …" — 07 files it.`);
        if (found.liked_by_me) throw new Error('The run idea is already liked by its author; it should start unliked.');
        idea = found;
      });
    });
  });

  it('IDL-01 Like on an idea card counts the like, and a second tap takes it back', () => {
    const like = () => cy.byTestId(`idea-card-like-${idea.id}`);
    openPodIdeas();
    like().should('have.attr', 'aria-pressed', 'false').and('have.text', String(idea.likes_count));
    cy.interceptOperation('TogglePodIdeaLike');
    like().click();
    cy.wait('@TogglePodIdeaLike');
    like().should('have.attr', 'aria-pressed', 'true').and('have.text', String(idea.likes_count + 1));
    like().click();
    cy.wait('@TogglePodIdeaLike');
    like().should('have.attr', 'aria-pressed', 'false').and('have.text', String(idea.likes_count));
  });

  it('IDL-02 Share hands the share sheet the idea with a tracked link and counts the share', () => {
    openPodIdeas();
    stubShareSheet();
    cy.interceptOperation('SharePodIdea');
    cy.byTestId(`idea-card-share-${idea.id}`).click();
    cy.wait('@SharePodIdea').its('response.body.data.sharePodIdea.shares_count').should('equal', idea.shares_count + 1);
    cy.get('@share').should('have.been.calledOnce');
    cy.get('@share').its('firstCall.args.0').should((payload: { title: string; text: string; url: string }) => {
      expect(payload.title, 'title').to.equal(idea.title);
      expect(payload.text, 'text').to.equal(idea.description);
      expect(payload.url, 'a link').to.match(/^https?:\/\/\S+$/);
    });
  });
});
