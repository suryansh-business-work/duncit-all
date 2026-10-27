/// <reference types="cypress" />
import { ACCESS_DENIED, expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { marked, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Host - create pod — the server refuses a member without host access even on
 * a direct call. Scenario map: Apps › Host - create pod ("USER without HOST is
 * refused by the server even with a direct call").
 *
 * createPartnerPod checks host access first (pod.write.ts createForPartner →
 * pod.validation.ts assertActiveHost), before the club, venue or anything in
 * the input is looked at; createPod is the admin path and asks for an admin
 * role before it reads anything. The club id is one no club has, so nothing
 * could be created even past a broken gate.
 */

const PARTNER_POD = `mutation E2eCreatePartnerPod($input: CreatePodInput!) { createPartnerPod(input: $input) { id } }`;
const ADMIN_POD = `mutation E2eCreateAdminPod($input: CreatePodInput!) { createPod(input: $input) { id } }`;

const HOST_REQUIRED = refusal('FORBIDDEN', 'Host access is required before creating pods');

describe('API · A member without host access cannot create a pod', { testIsolation: false }, () => {
  let memberToken = '';
  let input: Record<string, unknown> = {};

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) => {
        input = {
          pod_title: marked('pod'),
          pod_description: marked('pod-description'),
          pod_hosts_id: [id],
          club_id: NO_ID,
          pod_date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          pod_type: 'FREE',
        };
      });
    });
  });

  it('HCP-01 creating a pod as a partner is refused signed out', () => {
    cy.gqlRaw(PARTNER_POD, { input }, { token: null }).then((body) =>
      expectRefused('createPartnerPod', body, SIGNED_OUT),
    );
  });

  it('HCP-02 a member without host access is refused by the server on a direct call', () => {
    cy.gqlRaw(PARTNER_POD, { input }, { token: memberToken }).then((body) =>
      expectRefused('createPartnerPod', body, HOST_REQUIRED),
    );
  });

  it('HCP-03 the admin create path is closed to a member', () => {
    cy.gqlRaw(ADMIN_POD, { input }, { token: memberToken }).then((body) =>
      expectRefused('createPod', body, ACCESS_DENIED),
    );
  });
});
