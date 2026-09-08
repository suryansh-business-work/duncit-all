/**
 * The account a run tests with, and the marker every record it creates carries.
 *
 * The values arrive as CYPRESS_E2E_* from the workflow (Tech > E2E Tests >
 * Settings decides them; `scripts/report-e2e-run.mjs` hands them to the leg).
 * Locally, export the same variables before `pnpm e2e:live`.
 *
 * The MARKER is what the purge deletes by: `purgeE2eRunData` removes every
 * pod, draft, ticket, callback and idea whose title or subject carries
 * `[E2E <stamp>]`, and every account whose address carries the stamp. A spec
 * that creates a record WITHOUT the marker leaves it on staging forever —
 * always name records through `stamped()`.
 */

export interface E2eIdentity {
  /** `ddMMyyyyHHmm` at the moment the run started. */
  stamp: string;
  /** The stable account: an approved host on staging that has finished the interests survey. */
  loginEmail: string;
  /** The address this run signs UP as. Unique to the run. */
  signupEmail: string;
  password: string;
  /** The WhatsApp number the signup uses. One number signs up once per run. */
  phone: string;
}

const required = (name: string): string => {
  const value = String(Cypress.env(name) ?? '').trim();
  if (!value) {
    throw new Error(
      `CYPRESS_${name} is not set. The live suite needs the run identity from ` +
        'Tech > E2E Tests > Settings (email prefix, domain, password, phone). ' +
        'Locally: export CYPRESS_E2E_EMAIL, CYPRESS_E2E_SIGNUP_EMAIL, CYPRESS_E2E_PASSWORD, ' +
        'CYPRESS_E2E_PHONE and CYPRESS_E2E_STAMP before `pnpm e2e:live`.',
    );
  }
  return value;
};

export function identity(): E2eIdentity {
  return {
    stamp: required('E2E_STAMP'),
    loginEmail: required('E2E_EMAIL'),
    signupEmail: required('E2E_SIGNUP_EMAIL'),
    password: required('E2E_PASSWORD'),
    phone: required('E2E_PHONE'),
  };
}

/** `[E2E 070920260300]` — the run's marker. */
export const marker = (): string => `[E2E ${identity().stamp}]`;

/** A record name that the purge will find: `Sunset Jazz Session [E2E 070920260300]`. */
export const stamped = (name: string): string => `${name} ${marker()}`;

/**
 * A second address that still belongs to this run.
 *
 * The purge removes every account whose local part is the signup one plus a
 * `-suffix`, so `riya+070920260300-dup@duncit.com` is cleaned up with the rest.
 */
export function derivedEmail(suffix: string): string {
  const email = identity().signupEmail;
  const at = email.lastIndexOf('@');
  return `${email.slice(0, at)}-${suffix}${email.slice(at)}`;
}

/** The uploaded cover's file name, so the purge can find it in ImageKit by the stamp. */
export const coverFileName = (): string => `e2e-${identity().stamp}-cover.jpg`;

/**
 * A number no account holds, for the one scenario whose request must fail on
 * the EMAIL check — the phone is checked first, so it has to pass. Nothing is
 * ever sent to it: with one-time codes returned in the response, the request
 * never reaches a transport.
 */
export function unregisteredPhone(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  return `9${digits}`;
}

/** The password the recovery scenario sets on the signup account — it must differ from the old one. */
export const recoveredPassword = (): string => `${identity().password}-${identity().stamp.slice(-4)}`;
