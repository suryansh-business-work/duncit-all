/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { foreignPod, marked, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Host - manage pods — a member cannot edit, add status media to, or manage
 * the co-hosts of a pod someone else hosts. Scenario map: Apps › Host - manage
 * pods ("Host cannot edit, cancel or complete another host's pod").
 *
 * Each guard is the first thing its service does after loading the pod
 * (pod.validation.ts findHostedPod, pod.write.ts addStatus, coHost.service.ts
 * findOwnedPod). The inputs are ones the next check would refuse anyway — a
 * two-letter title, a link that was never uploaded, a co-host who is not on
 * the pod — so even a broken guard could not change the real pod.
 */

const NOT_HOST = refusal('FORBIDDEN', 'Only the pod host can manage this pod');
const POD_NOT_FOUND = refusal('NOT_FOUND', 'Pod not found');

const HOST_UPDATE = `mutation E2eHostUpdatePod($id: ID!, $input: HostUpdatePodInput!) {
  hostUpdatePod(pod_doc_id: $id, input: $input) { id }
}`;
const ADD_STATUS = `mutation E2eAddPodStatus($id: ID!, $media: PodMediaInput!) {
  addPodStatus(pod_doc_id: $id, media: $media) { id }
}`;
const REMOVE_CO_HOST = `mutation E2eRemoveCoHost($id: ID!, $user: ID!) {
  removeCoHost(pod_doc_id: $id, user_id: $user) { id }
}`;

const tooShortEdit = () => ({ pod_title: 'ab', pod_description: marked('host-edit'), pod_images_and_videos: [] });

describe("API · A member cannot manage another host's pod", { testIsolation: false }, () => {
  let memberToken = '';
  let podId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignPod(token, id).then((pod) => {
          podId = pod.id;
        }),
      );
    });
  });

  it('HM-01 editing a pod is refused signed out, and to a member who does not host it', () => {
    cy.gqlRaw(HOST_UPDATE, { id: podId, input: tooShortEdit() }, { token: null }).then((body) =>
      expectRefused('hostUpdatePod', body, SIGNED_OUT),
    );
    cy.gqlRaw(HOST_UPDATE, { id: podId, input: tooShortEdit() }, { token: memberToken }).then((body) =>
      expectRefused('hostUpdatePod', body, NOT_HOST),
    );
  });

  it('HM-02 editing a pod that does not exist answers "Pod not found"', () => {
    cy.gqlRaw(HOST_UPDATE, { id: NO_ID, input: tooShortEdit() }, { token: memberToken }).then((body) =>
      expectRefused('hostUpdatePod', body, POD_NOT_FOUND),
    );
  });

  it("HM-03 a member cannot add status media to someone else's pod", () => {
    cy.gqlRaw(ADD_STATUS, { id: podId, media: { url: 'not-uploaded' } }, { token: memberToken }).then((body) =>
      expectRefused('addPodStatus', body, refusal('FORBIDDEN', 'Only pod hosts can add status media')),
    );
  });

  it("HM-04 a member cannot manage the co-hosts of someone else's pod", () => {
    cy.gqlRaw(REMOVE_CO_HOST, { id: podId, user: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('removeCoHost', body, refusal('FORBIDDEN', 'Only the pod host can manage co-hosts')),
    );
  });
});
