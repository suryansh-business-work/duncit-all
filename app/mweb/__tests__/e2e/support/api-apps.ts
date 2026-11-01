/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import type { Refusal } from './access-steps';
import type { GqlBody } from './commands';
import { runAccount } from './run-account';

/**
 * Shared steps for the Apps API specs (specs/api/apps/**).
 *
 * Isolation checks need a record that is somebody else's. The run account owns
 * no venue, hosts no pod and administers no club, so any APPROVED public venue
 * and any listed pod on the server is, by construction, not its own. They are
 * read from the same public queries the apps use (publicVenues, pods), never
 * written: every call a spec aims at them is one whose guard runs before any
 * write, and where a broken guard could still reach a write the spec also sends
 * an input the next check refuses (a title too short, an unknown reason, a
 * missing booking), so a regression ends in a validation error, not a change.
 */

export const refusal = (code: string, message: string): Refusal => ({ code, message });

/** The call succeeded and `field` reads exactly `expected`. */
export function expectAnswer(field: string, body: GqlBody, expected: unknown): void {
  expect(body.errors, `${field} errors`).to.be.undefined;
  expect(body.data?.[field], field).to.deep.equal(expected);
}

/**
 * The server's schema validation (`validate` in server/src/utils/validate.ts)
 * refused the input: BAD_USER_INPUT "Validation failed", every message in
 * `messages` among its field errors, and `field` carries no data.
 */
export function expectInvalid(field: string, body: GqlBody, messages: readonly string[]): void {
  const [error] = body.errors ?? [];
  expect(error, `${field} must answer with an error`).to.exist;
  expect(error.extensions?.code, `${field} error code`).to.equal('BAD_USER_INPUT');
  expect(error.message, `${field} error message`).to.equal('Validation failed');
  const fieldErrors = (error.extensions as { errors?: string[] } | undefined)?.errors ?? [];
  expect(fieldErrors, `${field} field errors`).to.include.members([...messages]);
  expect(body.data?.[field] ?? null, `${field} must return no data`).to.be.null;
}

/** A run-owned label for anything a spec writes or sends as free text. */
export const marked = (surface: string): string => runMarker(runAccount().stamp, surface);

const ME_ID = `query E2eAppsMeId { me { user_id } }`;

/** The run account's own user id. */
export function memberId(token: string): Cypress.Chainable<string> {
  return cy.gql<{ me: { user_id: string } }>(ME_ID, {}, { token }).then(({ me }) => me.user_id);
}

const PUBLIC_VENUES = `query E2eAppsPublicVenues { publicVenues { id owner_user_id } }`;

/** An approved, active venue some other member owns. */
export function foreignVenueId(token: string, ownId: string): Cypress.Chainable<string> {
  return cy
    .gql<{ publicVenues: Array<{ id: string; owner_user_id: string }> }>(PUBLIC_VENUES, {}, { token })
    .then(({ publicVenues }) => {
      const venue = publicVenues.find((v) => v.owner_user_id !== ownId);
      if (!venue) throw new Error('The server lists no public venue: these isolation checks need one.');
      return venue.id;
    });
}

export interface ForeignPod {
  id: string;
  pod_type: 'FREE' | 'PAID';
  pod_hosts_id: string[];
}

const PUBLIC_PODS = `query E2eAppsPublicPods($filter: PodFilterInput) {
  pods(filter: $filter) { id pod_type pod_hosts_id }
}`;

/** A listed pod the run account does not host — of `type` when one is asked for. */
export function foreignPod(token: string, ownId: string, type?: ForeignPod['pod_type']): Cypress.Chainable<ForeignPod> {
  return cy
    .gql<{ pods: ForeignPod[] }>(PUBLIC_PODS, { filter: { is_active: true } }, { token })
    .then(({ pods }) => {
      const pod = pods.find(
        (p) => !p.pod_hosts_id.includes(ownId) && p.pod_hosts_id.length > 0 && (!type || p.pod_type === type),
      );
      if (!pod) throw new Error(`The server lists no ${type ?? ''} pod hosted by someone else: these checks need one.`);
      return pod;
    });
}
