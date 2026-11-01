/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRolesRefused, type StaffCall } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * Server: Email sending and localization — the record every send leaves.
 *
 * sendEmail (services/email/email.service.ts) writes one EmailLog row per
 * attempt: SENT once a provider took it, SKIPPED when it was deliberately not
 * sent (opted out, template inactive, E2E mute, a run-account code held for
 * the suite) and FAILED otherwise — and every row that did not go out says
 * why. Scenario map: Server › Email sending and localization — "Email log
 * outcomes" and "Held communications during an E2E run" (a code for the run
 * account is recorded for the suite, never mailed).
 *
 * Breaking SMTP, deactivating a template or switching a member's language
 * would change what real people receive; the suite reads the log as the Logs
 * seat (LOG_READ in content/emailLog/emailLog.resolver.ts) and holds every
 * row it is shown to those rules.
 */

interface LogRow {
  id: string;
  to: string;
  template: string;
  status: string;
  reason: string;
  provider: string;
  message_id: string;
}

const page = (filters: Array<{ field: string; op: string; value: string }>, search?: string): StaffCall =>
  call(
    'emailLogsTable',
    `query E2eEmailLogs($query: TableQueryInput) { emailLogsTable(query: $query) {
      total rows { id to template status reason provider message_id }
    } }`,
    { query: { page: 1, page_size: 100, filters, ...(search ? { search } : {}) } },
  );

/** e2eRun.codes.ts E2E_HELD_REASON and e2eRun.mute.ts MUTED_REASON. */
const HELD_REASON = 'Held for the E2E run account (Tech > E2E Tests > Settings)';
const MUTED_REASON = 'Communications are held for E2E (Tech > E2E Tests > Settings)';
/** The emailed one-time codes e2eRun.codes.ts holds for the run account. */
const CODE_TEMPLATES = [
  'login-otp',
  'password-reset-otp',
  'email-verification-otp',
  'password-change-otp',
  'account-deletion-otp',
  'portal-login-otp',
  'env-access-otp',
];

/** Staff seats outside Communications and Logs. */
const NOT_LOG_READERS: readonly E2eStaffRole[] = ['ADS_MANAGER', 'SUPPORT_USER'];

function readPage(token: string, c: StaffCall): Cypress.Chainable<LogRow[]> {
  return cy
    .gql<{ emailLogsTable: { rows: LogRow[] } }>(c.query, c.variables, { token })
    .then(({ emailLogsTable }) => emailLogsTable.rows);
}

describe('API · Every email attempt is on the record, with a reason when it did not go out', { testIsolation: false }, () => {
  before(() => {
    signInRunMember().then((token) => {
      expectCallsRefused(token, [page([])]);
    });
  });

  after(() => {
    revokeRunRoles(['LOGS_MANAGER', ...NOT_LOG_READERS]);
  });

  it('EL-01 the email log is refused to staff outside Communications and Logs', () => {
    expectRolesRefused(NOT_LOG_READERS, [page([])]);
  });

  it('EL-02 a skipped email never reached a provider and says why', () => {
    asRole('LOGS_MANAGER', (token) => {
      readPage(token, page([{ field: 'status', op: 'eq', value: 'SKIPPED' }])).then((rows) => {
        rows.forEach((row) => {
          expect(row.status).to.equal('SKIPPED');
          expect(row.reason.trim(), `${row.id} reason`).not.to.equal('');
          expect(row.message_id, `${row.id} has no provider message id`).to.equal('');
          expect(row.provider, `${row.id} provider`).to.be.oneOf(['', 'none']);
        });
      });
    });
  });

  it('EL-03 a failed email says why', () => {
    asRole('LOGS_MANAGER', (token) => {
      readPage(token, page([{ field: 'status', op: 'eq', value: 'FAILED' }])).then((rows) => {
        rows.forEach((row) => {
          expect(row.status).to.equal('FAILED');
          // A provider that refused every recipient still names itself, so only the reason is certain.
          expect(row.reason.trim(), `${row.id} reason`).not.to.equal('');
        });
      });
    });
  });

  it('EL-04 held and muted mail is SKIPPED, and only codes are ever held for the run account', () => {
    asRole('LOGS_MANAGER', (token) => {
      readPage(token, page([{ field: 'reason', op: 'eq', value: HELD_REASON }])).then((rows) => {
        rows.forEach((row) => {
          expect(row.status, `${row.id} held`).to.equal('SKIPPED');
          expect(row.template, `${row.id} only one-time codes are held`).to.be.oneOf(CODE_TEMPLATES);
        });
      });
      readPage(token, page([{ field: 'reason', op: 'eq', value: MUTED_REASON }])).then((rows) => {
        rows.forEach((row) => expect(row.status, `${row.id} muted`).to.equal('SKIPPED'));
      });
    });
  });

  it('EL-05 no one-time code addressed to the run account ever left the server', () => {
    asRole('LOGS_MANAGER', (token) => {
      readPage(token, page([], runAccount().email)).then((rows) => {
        rows
          .filter((row) => CODE_TEMPLATES.includes(row.template))
          .forEach((row) => {
            expect(row.status, `${row.template} to ${row.to} was held, not mailed`).not.to.equal('SENT');
          });
      });
    });
  });
});
