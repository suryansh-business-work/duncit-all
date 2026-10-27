/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Pod ideas moderation (/pod-ideas) — approving or rejecting a member's pod
 * idea is the one Pods console write ALL_PODS_ACCESS does hold
 * (pods/podIdea/podIdea.resolver.ts `ADMIN_ROLES`). The role check is the
 * resolver's first line; an idea id no idea has then answers "Idea not found",
 * which proves the call got past the guard without changing any idea.
 * The member's refusal is specs/api/partners/pods-console-access.cy.ts (SA-79).
 * Scenario map: Partners › Pod ideas moderation.
 */

const SET_STATUS = `mutation E2eModerateIdea($id: ID!) { setPodIdeaStatus(pod_idea_doc_id: $id, status: REJECTED) { id } }`;

describe('API · Pod ideas are moderated by the Pods console and the platform admins only', { testIsolation: false }, () => {
  let venuesStaffToken = '';
  let podsStaffToken = '';

  before(() => {
    signInRunAs(['ALL_VENUES_ACCESS']).then((token) => {
      venuesStaffToken = token;
    });
    revokeRunRoles(['ALL_VENUES_ACCESS']);
    signInRunAs(['ALL_PODS_ACCESS']).then((token) => {
      podsStaffToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_PODS_ACCESS']);
  });

  it('PIM-01 staff of another console cannot approve or reject an idea', () => {
    expectEachRefused('setPodIdeaStatus', SET_STATUS, { id: NO_ID }, [[venuesStaffToken, ACCESS_DENIED]]);
  });

  it('PIM-02 ALL_PODS_ACCESS passes the moderation guard: a missing idea is the only refusal', () => {
    expectEachRefused('setPodIdeaStatus', SET_STATUS, { id: NO_ID }, [
      [podsStaffToken, { code: 'NOT_FOUND', message: 'Idea not found' }],
    ]);
  });
});
