import {
  E2E_GRANT_ROLES_MUTATION,
  runMarker,
  runPassword,
  type E2eStaffRole,
  type RunPasswordStage,
} from '@duncit/utils';

/**
 * The run account, as this run's settings describe it.
 *
 * The values arrive as CYPRESS_E2E_* from the workflow (Tech > E2E Tests >
 * Settings decides them; scripts/report-e2e-run.mjs hands them to the job).
 * The account is the one the mWeb suite created: this project runs after mWeb
 * moved its password to CHANGED and filed the records it follows, each one
 * carrying `runMarker(stamp, 'mweb')`.
 */

const required = (name: string): string => {
  const value = String(Cypress.env(name) ?? '').trim();
  if (!value) {
    throw new Error(
      `CYPRESS_${name} is not set. The staff portals suite needs the run identity from Tech > E2E Tests > Settings ` +
        '(CYPRESS_E2E_SIGNUP_EMAIL, CYPRESS_E2E_PASSWORD, CYPRESS_E2E_STAMP) and ' +
        'CYPRESS_E2E_RELEASE_TOKEN for the e2e testing API.',
    );
  }
  return value;
};

export interface RunAccount {
  stamp: string;
  email: string;
  password: (stage: RunPasswordStage) => string;
  /** What every record the mWeb suite filed carries: `[E2E <stamp> mweb]`. */
  mwebMarker: string;
}

export function runAccount(): RunAccount {
  const email = required('E2E_SIGNUP_EMAIL');
  const base = required('E2E_PASSWORD');
  const stamp = required('E2E_STAMP');
  return {
    stamp,
    email,
    password: (stage) => runPassword(base, stage),
    mwebMarker: runMarker(stamp, 'mweb'),
  };
}

/** The role each portal's sign-in admits: Support, Legal, Pods. */
const STAFF_ROLES: readonly E2eStaffRole[] = ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS'];

/**
 * Give the run account the three portal roles. Roles travel in the token, so
 * every sign-in after this one carries them; the purge removes them with the
 * account.
 */
export function grantStaffRoles(account: RunAccount): void {
  cy.staffGql<{ grantE2eRunAccountRoles: string[] }>(E2E_GRANT_ROLES_MUTATION, {
    input: { stamp: account.stamp, email: account.email, roles: [...STAFF_ROLES] },
  })
    .its('grantE2eRunAccountRoles')
    .should('include.members', [...STAFF_ROLES]);
}
