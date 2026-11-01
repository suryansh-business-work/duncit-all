/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectOutsidersRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * Portal Shell › Staff calls — the server side of a call. The audio and video
 * go browser to browser, so what the API owns is: where a browser looks for a
 * route (staffCallIceServers — public STUN first, then the TURN relay from the
 * Tech portal's environment entries), the call history of one line
 * (staffCalls) and hanging a recording on a call (attachStaffCallRecording,
 * only on a call the caller was on). All three are staff only
 * (microservices/chat/staff/staffChat.resolver.ts STAFF_ROLES, the first
 * statement). Placing, answering and recording a call need two browsers with a
 * microphone and are not automated; no call is placed here. Scenario map:
 * Portal Shell › Staff calls.
 */

const ROLES: readonly E2eStaffRole[] = ['LOGS_MANAGER'];
/** staffCallIce.ts PUBLIC_STUN. */
const PUBLIC_STUN = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'];

interface IceServer {
  urls: string[];
  username: string;
  credential: string;
}

const ICE = call('staffCallIceServers', `query E2eIceServers { staffCallIceServers { urls username credential } }`);
const HISTORY = call(
  'staffCalls',
  `query E2eCallHistory($peer: ID!) { staffCalls(peer_id: $peer, limit: 5) { id kind outcome } }`,
  { peer: NO_ID },
);
const ATTACH = call(
  'attachStaffCallRecording',
  `mutation E2eAttachRecording($id: ID!) { attachStaffCallRecording(call_id: $id, url: "https://example.com/e2e-never.mp4") }`,
  { id: NO_ID },
);

describe('API · Staff calls: routes, history and recordings are for staff, on their own calls', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('CA-01 a staff member gets public STUN first, credential-free, and any relay after it as turn: URLs', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<IceServer[]>(token, ICE).then(([stun, ...relays]) => {
        expect(stun, 'public STUN entry').to.deep.equal({ urls: PUBLIC_STUN, username: '', credential: '' });
        expect(relays.length, 'at most one relay').to.be.at.most(1);
        relays.forEach((relay) => {
          expect(relay.urls, 'relay URLs').to.not.be.empty;
          relay.urls.forEach((url) => expect(url, 'relay URL').to.match(/^turns?:/));
        });
      });
    });
  });

  it('CA-02 a line nobody called on has no history, and a call the caller was not on takes no recording', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<unknown[]>(token, HISTORY).then((calls) => expect(calls, 'call history').to.deep.equal([]));
      cy.gqlRaw(ATTACH.query, ATTACH.variables ?? {}, { token }).then((body) => {
        const [error] = body.errors ?? [];
        expect(error?.extensions?.code, 'refusal code').to.equal('NOT_FOUND');
        expect(error?.message, 'refusal').to.equal('That call is not yours');
        expect(body.data?.attachStaffCallRecording ?? null, 'nothing attached').to.be.null;
      });
    });
  });

  it('CA-03 a member and a signed-out caller get no route, no history and no recording', () => {
    expectOutsidersRefused(memberToken, [ICE, HISTORY, ATTACH]);
  });
});
