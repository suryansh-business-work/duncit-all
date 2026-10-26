/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { foreignPod, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Live pod challenges — only the pod's hosts (and Challenge staff) set up and
 * run a challenge, and a challenge somebody may not see answers like one that
 * does not exist. Scenario map: Apps › Live pod challenges ("Non-host and
 * non-attendee are refused", "Host voids a score and removes an entry").
 *
 * podChallenge.access.ts: assertManage refuses anyone who is neither host nor
 * staff; assertView answers a hidden challenge with "Challenge not found", the
 * same as podChallenge.commit.ts loadChallenge for an id no challenge has.
 * Scores and entries are looked up first and refused as "not found" when they
 * are not there. Creating is aimed at a template id no template has, so a
 * broken host check would still stop before a challenge is written.
 */

const NOT_HOST = refusal('FORBIDDEN', 'Only the pod host can manage this challenge');
const CHALLENGE_NOT_FOUND = refusal('NOT_FOUND', 'Challenge not found');

const SETUP = `query E2eChallengeSetup($pod: ID!) { podChallengeSetup(pod_id: $pod) { pod_id } }`;
const CREATE = `mutation E2eCreateChallenge($input: CreatePodChallengeInput!) { createPodChallenge(input: $input) { id } }`;
const ONE = `query E2ePodChallenge($id: ID!) { podChallenge(id: $id) { id } }`;
const TRANSITION = `mutation E2eChallengeTransition($id: ID!) { transitionPodChallenge(id: $id, action: "START") { id } }`;
const VOID_SCORE = `mutation E2eVoidScore($id: ID!) { voidPodChallengeScore(event_id: $id, reason: "E2E check") { id } }`;
const REMOVE_ENTRY = `mutation E2eRemoveEntry($id: ID!) { removePodChallengeEntry(entry_id: $id) { id } }`;

describe("API · A pod's challenges are run by its host", { testIsolation: false }, () => {
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

  it("LC-01 a member cannot open the challenge setup of someone else's pod", () => {
    cy.gqlRaw(SETUP, { pod: podId }, { token: null }).then((body) =>
      expectRefused('podChallengeSetup', body, SIGNED_OUT),
    );
    cy.gqlRaw(SETUP, { pod: podId }, { token: memberToken }).then((body) =>
      expectRefused('podChallengeSetup', body, NOT_HOST),
    );
  });

  it("LC-02 a member cannot add a challenge to someone else's pod", () => {
    cy.gqlRaw(CREATE, { input: { pod_id: podId, template_id: NO_ID } }, { token: memberToken }).then((body) =>
      expectRefused('createPodChallenge', body, NOT_HOST),
    );
  });

  it('LC-03 a challenge that cannot be seen answers "Challenge not found", signed in or out', () => {
    cy.gqlRaw(ONE, { id: NO_ID }, { token: null }).then((body) => expectRefused('podChallenge', body, CHALLENGE_NOT_FOUND));
    cy.gqlRaw(ONE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('podChallenge', body, CHALLENGE_NOT_FOUND),
    );
  });

  it('LC-04 starting a challenge is refused signed out, and for one the member cannot reach', () => {
    cy.gqlRaw(TRANSITION, { id: NO_ID }, { token: null }).then((body) =>
      expectRefused('transitionPodChallenge', body, SIGNED_OUT),
    );
    cy.gqlRaw(TRANSITION, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('transitionPodChallenge', body, CHALLENGE_NOT_FOUND),
    );
  });

  it('LC-05 voiding a score or removing an entry the member cannot reach changes nothing', () => {
    cy.gqlRaw(VOID_SCORE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('voidPodChallengeScore', body, refusal('BAD_USER_INPUT', 'Score not found')),
    );
    cy.gqlRaw(REMOVE_ENTRY, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('removePodChallengeEntry', body, refusal('BAD_USER_INPUT', 'Entry not found')),
    );
  });
});
