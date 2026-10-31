/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { marked, refusal } from '../../../support/api-apps';

/**
 * Server: Pod draft cleanup — the date the sweep acts on.
 *
 * The daily sweep (pod-draft.cleanup.ts) deletes every Create-Pod draft whose
 * CREATED date is older than draft_retention_days; `PodDraft.expires_at` is
 * computed by the same module (pod-draft.retention.ts), so the countdown a
 * host sees is the sweep's own cutoff. Scenario map: Server › Pod draft
 * cleanup — "Expire old drafts" (retention counted from created_at, not the
 * last autosave).
 *
 * The suite cannot back-date a draft or wait a day for the sweep. It files
 * one marked draft of its own, proves its deadline is created_at plus the
 * configured window and that an autosave does not move it, and deletes it.
 */

interface Draft {
  id: string;
  pod_title: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const FIELDS = 'id pod_title created_at updated_at expires_at';
const SAVE = `mutation E2eSavePodDraft($id: ID, $input: PodDraftInput!) { savePodDraft(draft_id: $id, input: $input) { ${FIELDS} } }`;
const MINE = `query E2eMyPodDrafts { myPodDrafts { ${FIELDS} } }`;
const ONE = `query E2eMyPodDraft($id: ID!) { myPodDraft(draft_id: $id) { ${FIELDS} } }`;
const DELETE = `mutation E2eDeletePodDraft($id: ID!) { deletePodDraft(draft_id: $id) }`;
const RETENTION = `query E2eDraftRetention { publicAppSettings { draft_retention_days } }`;

const NOT_FOUND = refusal('NOT_FOUND', 'Draft not found');
const input = (title: string) => ({ payload: '{}', pod_title: title, pod_mode: 'PHYSICAL', step: 1 });

describe('API · A pod draft expires its retention window after it was created', { testIsolation: false }, () => {
  let token = '';
  let days = 0;
  let draft: Draft | null = null;

  before(() => {
    signInRunMember().then((t) => {
      token = t;
    });
    cy.gql<{ publicAppSettings: { draft_retention_days: number } }>(RETENTION, {}, { token: null }).then((data) => {
      // pod-draft.retention.ts draftRetentionDays: a blank or zero window is its default of 3, never under 1.
      days = Math.max(1, Math.floor(data.publicAppSettings.draft_retention_days) || 3);
    });
  });

  after(() => {
    // Only when a scenario failed before PD-04 deleted it.
    if (draft) cy.gqlRaw(DELETE, { id: draft.id }, { token });
  });

  it('PD-01 drafts are a signed-in member\'s own: a signed-out save is refused', () => {
    cy.gqlRaw(SAVE, { input: input(marked('draft')) }, { token: null }).then((body) =>
      expectRefused('savePodDraft', body, SIGNED_OUT),
    );
  });

  it('PD-02 a new draft is due for deletion exactly draft_retention_days after it was created', () => {
    cy.gql<{ savePodDraft: Draft }>(SAVE, { input: input(marked('draft')) }, { token }).then(({ savePodDraft }) => {
      draft = savePodDraft;
      expect(savePodDraft.expires_at, 'expires_at').to.be.a('string');
      const created = Date.parse(savePodDraft.created_at);
      expect(created, 'created_at is a real instant').to.be.a('number').and.not.be.NaN;
      expect(Date.parse(String(savePodDraft.expires_at)) - created, `${days} day(s) after creation`).to.equal(days * DAY_MS);
    });
  });

  it('PD-03 an autosave moves updated_at but never the creation date or the deadline', () => {
    const before = draft as Draft;
    const retitled = `${before.pod_title} (autosaved)`;
    cy.gql<{ savePodDraft: Draft }>(SAVE, { id: before.id, input: input(retitled) }, { token }).then(({ savePodDraft }) => {
      expect(savePodDraft.id).to.equal(before.id);
      expect(savePodDraft.pod_title).to.equal(retitled);
      expect(savePodDraft.created_at).to.equal(before.created_at);
      expect(savePodDraft.expires_at).to.equal(before.expires_at);
      expect(Date.parse(savePodDraft.updated_at)).to.be.at.least(Date.parse(before.updated_at));
    });
    cy.gql<{ myPodDrafts: Draft[] }>(MINE, {}, { token }).then(({ myPodDrafts }) => {
      const listed = myPodDrafts.find((d) => d.id === before.id);
      expect(listed, 'the draft is in the member\'s list').to.exist;
      expect(listed?.expires_at, 'the list shows the same deadline').to.equal(before.expires_at);
    });
  });

  it('PD-04 deleting the draft removes it, and a second delete or read says it is gone', () => {
    const id = (draft as Draft).id;
    cy.gql<{ deletePodDraft: boolean }>(DELETE, { id }, { token }).its('deletePodDraft').should('equal', true);
    cy.then(() => {
      draft = null;
    });
    cy.gqlRaw(DELETE, { id }, { token }).then((body) => expectRefused('deletePodDraft', body, NOT_FOUND));
    cy.gqlRaw(ONE, { id }, { token }).then((body) => expectRefused('myPodDraft', body, NOT_FOUND));
  });
});
