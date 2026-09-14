import { runPassword, type RunPasswordStage } from '@duncit/utils';

/**
 * The run account, as this run's settings describe it.
 *
 * The values arrive as CYPRESS_E2E_* from the workflow (Tech > E2E Tests >
 * Settings decides them; scripts/report-e2e-run.mjs hands them to the job).
 * The account is the one the mWeb suite created: the Partners specs run after
 * mWeb moved its password to CHANGED, so the password is derived from that
 * stage rather than remembered.
 */

const required = (name: string): string => {
  const value = String(Cypress.env(name) ?? '').trim();
  if (!value) {
    throw new Error(
      `CYPRESS_${name} is not set. The account suite needs the run identity from Tech > E2E Tests > Settings ` +
        '(CYPRESS_E2E_SIGNUP_EMAIL, CYPRESS_E2E_PASSWORD, CYPRESS_E2E_STAMP) and ' +
        'CYPRESS_E2E_RELEASE_TOKEN for the OTP testing API.',
    );
  }
  return value;
};

export interface RunAccount {
  stamp: string;
  email: string;
  password: (stage: RunPasswordStage) => string;
}

export function runAccount(): RunAccount {
  const email = required('E2E_SIGNUP_EMAIL');
  const base = required('E2E_PASSWORD');
  return {
    stamp: required('E2E_STAMP'),
    email,
    password: (stage) => runPassword(base, stage),
  };
}
