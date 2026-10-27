/// <reference types="cypress" />
import { profileUrl } from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';
import { openFromMenu } from '../../../support/menu-steps';
import { openAccount } from '../../../support/profile-steps';
import { expectInOrder, stubClipboard, stubShareSheet } from '../../../support/ui-apps-1';

/**
 * Profile, live on staging, as the run account. Manage Account (/account) is
 * read in the order AccountPage.tsx lays it out; sharing reads the @handle the
 * account already holds (04 set it); Account Health opens its own page.
 */

const ME_QUERY = `query E2eProfileMe { me { user_id username full_name } }`;
const HEALTH_QUERY = `query E2eHealthBand { myAccountHealth { total_score } }`;

type ProfileMe = { me: { user_id: string; username: string | null; full_name: string } };

describe('UI Profile', () => {
  let me: ProfileMe['me'];

  before(() => {
    signInRunMember();
    cy.gql<ProfileMe>(ME_QUERY).then((data) => {
      me = data.me;
    });
  });

  it('PR-01 Manage Account, from the menu, opens /account with its sections in order', () => {
    cy.interceptOperation('MyAccountHealth');
    openFromMenu('sidebar-item-Manage Account', '/account');
    cy.wait('@MyAccountHealth');
    cy.byTestId('account-screen').should('be.visible');
    cy.byTestId('account-profile-header').should('contain.text', me.full_name);
    expectInOrder([
      'account-profile-header',
      'account-details-card',
      'account-health',
      'privacy-card',
      'comm-preference-entry',
      'privacy-entry',
      'account-connected-section',
      'security-section',
    ]);
  });

  it('PR-02 the @handle on /profile copies the profile link', () => {
    expect(me.username, 'the run account has a username (04 set it)').to.be.a('string').and.not.be.empty;
    const link = (origin: string) => profileUrl(origin, String(me.username));
    cy.visitApp('/profile');
    stubClipboard();
    cy.byTestId('profile-handle-link').should('contain.text', `@${me.username}`).click();
    cy.location('origin').then((origin) => {
      cy.get('@clipboard').should('have.been.calledOnceWith', link(origin));
    });
    cy.byTestId('notify-host-alert').should('contain.text', 'Profile link copied');
  });

  it('PR-03 Share on Manage Account hands the same profile link to the share sheet', () => {
    openAccount();
    stubShareSheet();
    cy.byTestId('account-share').should('contain.text', 'Share').click();
    cy.location('origin').then((origin) => {
      cy.get('@share').should('have.been.calledOnceWith', {
        title: me.full_name,
        text: `${me.full_name} on Duncit`,
        url: profileUrl(origin, String(me.username)),
      });
    });
  });

  it('PR-04 the Account Health card opens /account/health, and Back returns to /account', () => {
    cy.gql(HEALTH_QUERY).its('myAccountHealth.total_score').should('be.a', 'number');
    openAccount();
    cy.byTestId('account-health').click();
    cy.location('pathname').should('eq', '/account/health');
    cy.byTestId('account-health-screen').should('be.visible');
    cy.byTestId('account-health-error').should('not.exist');
    cy.byTestId('account-health-back').click();
    cy.location('pathname').should('eq', '/account');
    cy.byTestId('account-screen').should('be.visible');
  });
});
