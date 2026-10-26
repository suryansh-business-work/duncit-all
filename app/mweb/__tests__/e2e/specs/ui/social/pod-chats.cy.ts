/// <reference types="cypress" />
import { expectRefused, signInRunMember } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';
import { openFromMenu } from '../../../support/menu-steps';
import { listedPod, runMe } from '../../../support/ui-apps-2';

/**
 * Pod chats (UI), live on staging. The run account has joined and hosts no
 * pod, so its chat list is the guidance state, and any listed pod's room is
 * one it may not read. Nothing is sent: a message would reach real members.
 */

const MY_ROOMS = `query E2eUiMyChatRooms { myChatRooms { id } }`;
const PARTICIPANTS = `query E2eUiChatParticipants($id: ID!) { chatParticipants(pod_id: $id) { participant_count } }`;
const NOT_A_MEMBER = refusal('FORBIDDEN', 'Not a pod member');

describe('Pod chats', { testIsolation: false }, () => {
  let meId = '';

  before(() => {
    signInRunMember();
    runMe().then((me) => {
      meId = me.user_id;
    });
    cy.gql<{ myChatRooms: unknown[] }>(MY_ROOMS).then(({ myChatRooms }) => {
      expect(myChatRooms, 'the run account has no pod rooms').to.have.length(0);
    });
  });

  it('CH-01 with no joined or hosted pod, Chats explains how to start one', () => {
    cy.interceptOperation('MyChatRooms');
    openFromMenu('sidebar-grid-chats', '/chats');
    cy.wait('@MyChatRooms');
    cy.byTestId('chats-screen').should('be.visible');
    cy.byTestId('chats-empty').should(
      'have.text',
      "You haven't joined any pods yet. Join or host a pod to start chatting with attendees.",
    );
    cy.byTestId('chats-list').should('not.exist');
  });

  it('CH-02 a pod the member did not join: the room shows no messages and the server answers Not a pod member', () => {
    listedPod(meId).then((pod) => {
      cy.interceptOperation('PodMessages');
      cy.visitApp(`/chats/${pod.id}`);
      cy.wait('@PodMessages').its('response.body.errors.0.message').should('eq', NOT_A_MEMBER.message);
      cy.byTestIdPrefix('chat-message-').should('not.exist');
      cy.gqlRaw(PARTICIPANTS, { id: pod.id }).then((body) => expectRefused('chatParticipants', body, NOT_A_MEMBER));
    });
  });
});
