/// <reference types="cypress" />
import { profileUrl } from '@duncit/utils';
import { expectRefused, signInRunMember } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';
import { notice, runMe, watchClipboard, type RunMe } from '../../../support/ui-apps-2';

/**
 * Follow & public profiles (UI), live on staging, from the run account's own
 * side: its public profile by handle and by id, the owner actions that stand
 * in for Follow, its (empty) connections, sharing it, and the Hosts & Venues
 * directory read-only. Following somebody would notify them, so no scenario
 * here follows anyone.
 */

const PUBLIC_PROFILE = `query E2eUiPublicProfile($handle: ID!) { publicUserProfile(user_id: $handle) { user_id full_name } }`;
const FOLLOW_LISTS = `query E2eUiFollowLists($id: ID!) { followersOf(user_id: $id) { user_id } followingOf(user_id: $id) { user_id } }`;
const FOLLOW = `mutation E2eUiFollowUser($id: ID!) { followUser(user_id: $id) { user_id } }`;
const DIRECTORY = `query E2eUiDirectory { publicHosts { user_id } publicVenues { id } }`;

interface Profile {
  user_id: string;
  full_name: string;
}

const profileOf = (handle: string) =>
  cy.gql<{ publicUserProfile: Profile | null }>(PUBLIC_PROFILE, { handle }).then(({ publicUserProfile }) => {
    if (!publicUserProfile) throw new Error(`/u/${handle} resolves to no profile.`);
    return publicUserProfile;
  });

function openProfile(): void {
  cy.interceptOperation('MeAndMyPosts');
  cy.visitApp('/profile');
  cy.wait('@MeAndMyPosts');
  cy.byTestId('profile-page').should('be.visible');
}

function openPublicProfile(handle: string): void {
  cy.interceptOperation('PublicProfile');
  cy.visitApp(`/u/${handle}`);
  cy.wait('@PublicProfile');
  cy.byTestId('public-profile-page').should('be.visible');
}

describe('Social - follow', { testIsolation: false }, () => {
  let me: RunMe;
  let handle = '';

  before(() => {
    signInRunMember();
    runMe().then((found) => {
      me = found;
      if (!found.username) throw new Error('The run account has no username (04-profile sets one): /u/:handle needs it.');
      handle = found.username;
    });
  });

  it('FO-01 /u/:handle opens by @username and by the legacy user id, and Back returns', () => {
    profileOf(handle).then((byHandle) => {
      profileOf(me.user_id).its('user_id').should('eq', byHandle.user_id);
      openProfile();
      openPublicProfile(handle);
      cy.byTestId('public-profile-header-name').should('have.text', byHandle.full_name);
      openPublicProfile(me.user_id);
      cy.byTestId('public-profile-header-name').should('have.text', byHandle.full_name);
      cy.byTestId('public-profile-page-back').click();
      cy.location('pathname').should('eq', `/u/${handle}`);
    });
  });

  it('FO-02 your own profile shows Edit, Settings and New instead of Follow; the server refuses a self-follow', () => {
    openPublicProfile(handle);
    cy.byTestId('profile-follow-actions').should('not.exist');
    cy.byTestId('public-profile-owner-actions-edit').should('contain.text', 'Edit').click();
    cy.location('pathname').should('eq', '/account');
    openPublicProfile(handle);
    cy.byTestId('public-profile-owner-actions-settings').should('contain.text', 'Settings').click();
    cy.location('pathname').should('eq', '/account');
    openPublicProfile(handle);
    cy.byTestId('public-profile-owner-actions-new').should('contain.text', 'New').click();
    cy.location('pathname').should('eq', '/pod-ideas');
    cy.gqlRaw(FOLLOW, { id: me.user_id }).then((body) =>
      expectRefused('followUser', body, refusal('BAD_USER_INPUT', 'You cannot follow yourself')),
    );
  });

  it('FO-03 the counts open Connections, empty for a new member on both sides', () => {
    cy.gql<{ followersOf: unknown[]; followingOf: unknown[] }>(FOLLOW_LISTS, { id: me.user_id }).then((lists) => {
      expect(lists.followersOf, 'the run account has no followers').to.have.length(0);
      expect(lists.followingOf, 'the run account follows nobody').to.have.length(0);
    });
    openProfile();
    cy.byTestId('profile-header-stat-followers').should('contain.text', '0').click();
    cy.byTestId('follow-list-dialog').should('be.visible');
    cy.byTestId('follow-list-dialog-empty').should('have.text', 'No followers yet.');
    cy.location('search').should('contain', 'selectedtab_connections=followers');
    cy.byTestId('follow-list-dialog-close').click();
    cy.byTestId('profile-header-stat-following').should('contain.text', '0').click();
    cy.byTestId('follow-list-dialog-empty').should('have.text', 'Not following anyone yet.');
    cy.location('search').should('contain', 'selectedtab_connections=following');
    cy.byTestId('follow-list-dialog-close').click();
  });

  it('FO-04 Share profile copies the readable /u/<username> link, not a short link', () => {
    openProfile();
    watchClipboard();
    cy.byTestId('profile-header-share').click();
    cy.location('origin').then((origin) => {
      cy.get('@copied').should('have.been.calledOnceWith', profileUrl(origin, handle));
    });
    notice().should('have.text', 'Link copied to clipboard');
  });

  it('FO-05 Hosts & Venues opens on Hosts, both tabs list the directory, and the tab is kept in the URL', () => {
    cy.gql<{ publicHosts: unknown[]; publicVenues: unknown[] }>(DIRECTORY).then((directory) => {
      cy.interceptOperation('PublicHosts');
      cy.visitApp('/hosts-venues');
      cy.wait('@PublicHosts');
      cy.byTestId('hv-tab-hosts').should('have.attr', 'aria-selected', 'true').and('contain.text', String(directory.publicHosts.length));
      cy.byTestId('hv-tab-venues').should('contain.text', String(directory.publicVenues.length));
      if (directory.publicHosts.length > 0) cy.byTestIdPrefix('host-card-').should('have.length', directory.publicHosts.length);
      else cy.byTestId('hosts-empty').should('be.visible');

      cy.byTestId('hv-tab-venues').click();
      cy.byTestId('hv-tab-venues').should('have.attr', 'aria-selected', 'true');
      cy.location('search').should('contain', 'selectedtab=VENUES');
      if (directory.publicVenues.length > 0) cy.byTestIdPrefix('venue-card-').should('have.length', directory.publicVenues.length);
      else cy.byTestId('venues-empty').should('be.visible');
    });
  });
});
