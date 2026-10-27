/// <reference types="cypress" />
import { podPhase } from '@duncit/utils';
import { expectRefused, signInRunMember } from '../../../support/access-steps';
import { isStranger, loadWorld, podWhere, type WorldPod } from '../../../support/ui-apps-1';

/**
 * Pod media (/pod/:podId/media), live on staging, opened by someone the host
 * did not mark present. The page tells them why instead of offering a picker
 * (PodMediaView.tsx, viewer NONE), and the server refuses the write the picker
 * would have made (podMedia.service.ts `add`).
 */

const ADD_MEDIA_MUTATION = `mutation E2eAddPodMedia($pod_doc_id: ID!, $media: [PodMediaInput!]!) {
  addPodPartyMedia(pod_doc_id: $pod_doc_id, media: $media) { pod_id }
}`;

const NOT_INVITED =
  'Only the host and the people whose attendance was marked can add media to this pod. Ask the host to mark you present.';

describe('UI Pod media', () => {
  let pod: WorldPod;
  let token = '';

  before(() => {
    signInRunMember().then((issued) => {
      token = issued;
    });
    loadWorld().then((world) => {
      pod = podWhere(world, 'a past pod the run account neither hosted nor joined', (row) =>
        podPhase(row.pod_date_time, row.pod_end_date_time) === 'PREVIOUS' && isStranger(world, row),
      );
    });
  });

  it('PM-01 a media link opened by someone not marked present says why and offers no upload', () => {
    cy.interceptOperation('PodMediaBoard');
    cy.visitApp(`/pod/${pod.id}/media`);
    cy.wait('@PodMediaBoard').its('response.body.data.podMediaBoard').should((board: { viewer: string; can_upload: boolean }) => {
      expect(board.viewer, 'viewer').to.equal('NONE');
      expect(board.can_upload, 'can upload').to.equal(false);
    });
    cy.byTestId('pod-media-view-not-invited').should('have.text', NOT_INVITED);
    cy.byTestId('pod-media-view-uploading').should('not.exist');
  });

  it('PM-02 the server refuses media added by someone not marked present', () => {
    cy.gqlRaw(
      ADD_MEDIA_MUTATION,
      { pod_doc_id: pod.id, media: [{ url: 'https://example.com/e2e-not-uploaded.jpg', type: 'IMAGE' }] },
      { token },
    ).then((body) =>
      expectRefused('addPodPartyMedia', body, {
        code: 'FORBIDDEN',
        message: 'Only the host and the people marked present can add media to this pod',
      }),
    );
  });
});
