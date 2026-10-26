/// <reference types="cypress" />
import { openSignedOut } from '../../../support/account-steps';
import { runAccount } from '../../../support/run-account';
import {
  declineTracking,
  expectSignInFor,
  isUpcomingLinkable,
  listedPods,
  mePlace,
  podPath,
  signInFromHere,
  type ListedPod,
} from '../../../support/ui-apps-3';

/**
 * Public host page, live (scenario map › Public host page).
 *
 * /hosts/:handle is public (coreRoutes.tsx). `publicUserProfile` resolves the
 * @username or a user id, signed out too, and the page renders only when that
 * account `is_host` (host-page/HostPage.tsx) — an unknown handle and a member
 * who is not a host both get "This host page is not available.". The host and
 * their upcoming pod are read from the public queries first; the non-host is
 * the run account itself, a plain member.
 */

interface HostProfile {
  user_id: string;
  username: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  is_host: boolean;
}

const PROFILE = `query E2eUi3HostProfile($handle: ID!) {
  publicUserProfile(user_id: $handle) { user_id username full_name first_name last_name is_host }
}`;

const NOT_FOUND = 'This host page is not available.';

/** `hostDisplayName`: the full name, else first + last, else the handle. */
const displayName = (host: HostProfile): string =>
  host.full_name?.trim() || [host.first_name, host.last_name].filter(Boolean).join(' ') || host.username;

/** The first of `pods` whose first host is a host with a username — and that host. */
function hostWithPod(pods: readonly ListedPod[], index = 0): Cypress.Chainable<{ host: HostProfile; pod: ListedPod }> {
  if (index >= pods.length) {
    throw new Error('Staging prerequisite: an approved host with a username and an upcoming listed pod.');
  }
  const pod = pods[index];
  return cy
    .gql<{ publicUserProfile: HostProfile | null }>(PROFILE, { handle: pod.pod_hosts_id[0] })
    .then(({ publicUserProfile }) => {
      if (publicUserProfile?.is_host && publicUserProfile.username) {
        return cy.wrap({ host: publicUserProfile, pod }, { log: false });
      }
      return hostWithPod(pods, index + 1);
    });
}

describe('Public host page', () => {
  const account = runAccount();
  let host: HostProfile;
  let hostPod: ListedPod;
  let ownUsername = '';

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    mePlace().then((me) => {
      ownUsername = me.username;
    });
    listedPods()
      .then((pods) => hostWithPod(pods.filter((pod) => isUpcomingLinkable(pod) && pod.pod_hosts_id.length > 0)))
      .then((found) => {
        host = found.host;
        hostPod = found.pod;
      });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('HP-01 signed out, /hosts/<username> shows the host and their pods', () => {
    openSignedOut(`/hosts/${host.username}`);
    cy.location('pathname').should('eq', `/hosts/${host.username}`);
    cy.byTestId('host-page-screen').should('be.visible');
    cy.byTestId('host-page-header-title').should('have.text', displayName(host));
    cy.byTestId('host-page-name').should('have.text', displayName(host));
    cy.byTestId('host-page-pods').should('be.visible');
    cy.byTestId(`pod-card-${hostPod.id}`).should('contain.text', hostPod.pod_title);
  });

  it('HP-02 a pod tapped signed out asks to sign in, names the pod, and opens it after sign-in', () => {
    const target = podPath(hostPod);
    openSignedOut(`/hosts/${host.username}`);
    cy.byTestId(`pod-card-${hostPod.id}-price`).click();
    expectSignInFor(target);
    cy.byTestId('auth-pod-banner-title').should('have.text', hostPod.pod_title);
    signInFromHere();
    cy.location('pathname').should('eq', target);
  });

  it('HP-03 a handle nobody has shows the not-found state', () => {
    openSignedOut(`/hosts/e2e-${account.stamp}-nobody`);
    cy.byTestId('host-page-not-found-title').should('have.text', NOT_FOUND);
    cy.byTestId('host-page-screen').should('not.exist');
  });

  it('HP-04 a member who is not a host has no host page', () => {
    openSignedOut(`/hosts/${ownUsername}`);
    cy.byTestId('host-page-not-found-title').should('have.text', NOT_FOUND);
    cy.byTestId('host-page-pods').should('not.exist');
  });
});
