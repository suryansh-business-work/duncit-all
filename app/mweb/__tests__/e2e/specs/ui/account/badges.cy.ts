/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';

/**
 * Badges (UI), live on staging, read-only. The catalogue and the run
 * account's progress come from `myBadgeProgress` — the query both the Badges
 * page and the profile strip read — so every card's state is the server's.
 */

const PROGRESS = `query E2eUiBadgeProgress {
  myBadgeProgress { current target achieved badge { id title } }
}`;

interface ProgressRow {
  current: number;
  target: number;
  achieved: boolean;
  badge: { id: string; title: string };
}

const progress = () =>
  cy.gql<{ myBadgeProgress: ProgressRow[] }>(PROGRESS).then(({ myBadgeProgress }) => myBadgeProgress);

describe('Badges', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  it('BG-01 /badges lists every published badge with its state and progress, and counts the unlocked ones', () => {
    progress().then((rows) => {
      cy.interceptOperation('MyBadgeProgress');
      cy.visitApp('/badges');
      cy.wait('@MyBadgeProgress');
      cy.byTestId('badges-screen').should('be.visible');
      if (rows.length === 0) {
        cy.byTestId('badges-empty').should('have.text', 'No badges have been published yet. Check back soon.');
        return;
      }
      const unlocked = rows.filter((row) => row.achieved).length;
      cy.byTestId('badges-screen').should('contain.text', `${unlocked} of ${rows.length} unlocked`);
      cy.byTestIdPrefix('badge-card-', '-status').should('have.length', rows.length);
      rows.forEach((row) => {
        cy.byTestId(`badge-card-${row.badge.id}`)
          .should('contain.text', row.badge.title)
          .and('contain.text', `${Math.min(row.current, row.target)} / ${row.target}`);
        cy.byTestId(`badge-card-${row.badge.id}-status`).should('have.text', row.achieved ? 'Achieved' : 'Locked');
      });
    });
  });

  it('BG-02 the profile strip shows exactly the achieved badges, and View all badges opens /badges', () => {
    progress().then((rows) => {
      const achieved = rows.filter((row) => row.achieved);
      cy.interceptOperation('MyBadgeProgress');
      cy.visitApp('/profile');
      cy.wait('@MyBadgeProgress');
      if (achieved.length === 0) {
        cy.byTestId('profile-badges-strip-empty').should(
          'have.text',
          'No badges yet — join pods, bring a friend along and explore new categories to start unlocking them.',
        );
      } else {
        cy.byTestIdPrefix('profile-badges-strip-badge-').should('have.length', achieved.length);
        achieved.forEach((row) => cy.byTestId(`profile-badges-strip-badge-${row.badge.id}`).should('exist'));
      }
      cy.byTestId('profile-badges-strip-view-all').should('contain.text', 'View all badges').click();
      cy.location('pathname').should('eq', '/badges');
    });
  });
});
