/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';

/**
 * Notification Permission — the server half of "Allow notifications". Scenario
 * map: Apps › Notification Permission ("Enable web push on mWeb", "Disable web
 * push on mWeb", "Native push registration and switch").
 *
 * mWeb subscribes the browser with the VAPID key pushConfig hands out (pwa.ts
 * ensurePushSubscription) and stores it with savePushSubscription; the native
 * app registers its Expo token with saveExpoPushToken at sign-in and removes it
 * at sign-out. Every write is the signed-in account's own (requireAuth in
 * notification.resolver.ts), and an empty Expo token is refused before anything
 * is stored. The browser's permission prompt itself cannot be answered by an
 * automated browser, so the subscription is not created here.
 */

const PUSH_CONFIG = `query E2ePushConfig { pushConfig { publicKey } }`;
const SAVE_WEB = `mutation E2eSavePush($input: PushSubscriptionInput!) { savePushSubscription(input: $input) }`;
const DELETE_WEB = `mutation E2eDeletePush($endpoint: String!) { deletePushSubscription(endpoint: $endpoint) }`;
const SAVE_EXPO = `mutation E2eSaveExpoToken($token: String!) { saveExpoPushToken(token: $token, platform: "android") }`;
const DELETE_EXPO = `mutation E2eDeleteExpoToken($token: String!) { deleteExpoPushToken(token: $token) }`;

/** A subscription in the browser's shape that no push service issued. */
const SUBSCRIPTION = { endpoint: 'https://push.invalid/e2e', p256dh: 'e2e', auth: 'e2e' };

describe('API · Push registration belongs to a signed-in account', { testIsolation: false }, () => {
  let token = '';

  before(() => {
    signInRunMember().then((member) => {
      token = member;
    });
  });

  it('NP-01 the browser gets the server’s VAPID public key to subscribe with, signed in or not', () => {
    cy.gql<{ pushConfig: { publicKey: string } }>(PUSH_CONFIG, {}, { token: null })
      .its('pushConfig.publicKey')
      .should('match', /^[\w-]{80,}$/);
    cy.gql<{ pushConfig: { publicKey: string } }>(PUSH_CONFIG, {}, { token }).then(({ pushConfig }) => {
      cy.gql<{ pushConfig: { publicKey: string } }>(PUSH_CONFIG, {}, { token: null })
        .its('pushConfig.publicKey')
        .should('eq', pushConfig.publicKey);
    });
  });

  it('NP-02 a signed-out caller can neither register nor remove a browser subscription or a device token', () => {
    cy.gqlRaw(SAVE_WEB, { input: SUBSCRIPTION }, { token: null }).then((body) =>
      expectRefused('savePushSubscription', body, SIGNED_OUT),
    );
    cy.gqlRaw(DELETE_WEB, { endpoint: SUBSCRIPTION.endpoint }, { token: null }).then((body) =>
      expectRefused('deletePushSubscription', body, SIGNED_OUT),
    );
    cy.gqlRaw(SAVE_EXPO, { token: 'ExponentPushToken[e2e]' }, { token: null }).then((body) =>
      expectRefused('saveExpoPushToken', body, SIGNED_OUT),
    );
    cy.gqlRaw(DELETE_EXPO, { token: 'ExponentPushToken[e2e]' }, { token: null }).then((body) =>
      expectRefused('deleteExpoPushToken', body, SIGNED_OUT),
    );
  });

  it('NP-03 a native sign-in with no push token registers nothing', () => {
    cy.gqlRaw(SAVE_EXPO, { token: '   ' }, { token }).then((body) =>
      expectRefused('saveExpoPushToken', body, refusal('BAD_USER_INPUT', 'Push token is required')),
    );
  });
});
