/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { call, expectCallsRefused, expectRolesRefused, type StaffCall } from '../../../support/api-staff';

/**
 * Server: Account deletion sweep — who may see and steer it.
 *
 * The one-minute tick carries out due PENDING deletion requests on the
 * Admin Panel schedule (access/accountDeletion/accountDeletion.cron.ts). The
 * schedule, the due count and the run log are TECH_REVIEW (SUPER_ADMIN,
 * TECH_MANAGER); switching the schedule or pressing Run now is SUPER_ADMIN
 * alone, because both hand irreversible purges to a timer or a click
 * (accountDeletion.resolver.ts CRON_ADMIN). The retention window itself is
 * readable by every signed-in member, since both apps quote it before anyone
 * confirms. Scenario map: Server › Account deletion sweep — "Scheduled purge of
 * due requests" (who controls it). "Sealed accounts refresh" is driven live by
 * specs/08-delete.cy.ts, which files the run account's own request.
 *
 * The suite never holds SUPER_ADMIN or TECH_MANAGER, never switches the
 * schedule on and never calls Run now: a broken gate there would delete real
 * staging accounts. The only write it sends is a schedule change whose time
 * the validator refuses even if the role check let it through.
 */

const READS: StaffCall[] = [
  call(
    'accountDeletionCronSettings',
    `query E2eDeletionCron { accountDeletionCronSettings { cron_enabled cron_time_of_day } }`,
  ),
  call('accountDeletionDueCount', `query E2eDeletionDueCount { accountDeletionDueCount }`),
  call('accountDeletionRuns', `query E2eDeletionRuns { accountDeletionRuns(query: { page_size: 1 }) { total } }`),
];
const RESCHEDULE = call(
  'updateAccountDeletionCron',
  `mutation E2eDeletionCronUpdate { updateAccountDeletionCron(input: { cron_time_of_day: "not-a-time" }) { cron_enabled } }`,
);
const CONTROLS = [...READS, RESCHEDULE];

const WINDOW = `query E2eDeletionWindow { accountDeletionSettings { retention_days } }`;

/** Staff seats that run other consoles and must not reach the deletion sweep. */
const OTHER_STAFF: readonly E2eStaffRole[] = ['LOGS_MANAGER', 'SUPPORT_MANAGER', 'CITY_ADMIN'];

describe('API · The account deletion sweep is steered by Tech alone', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(OTHER_STAFF);
  });

  it('ADS-01 the retention window is readable by any signed-in member and by nobody signed out', () => {
    cy.gql<{ accountDeletionSettings: { retention_days: number } }>(WINDOW, {}, { token: memberToken }).then(
      ({ accountDeletionSettings }) => {
        expect(Number.isInteger(accountDeletionSettings.retention_days), 'whole days').to.equal(true);
        expect(accountDeletionSettings.retention_days).to.be.at.least(0);
      },
    );
    cy.gqlRaw(WINDOW, {}, { token: null }).then((body) => expectRefused('accountDeletionSettings', body, SIGNED_OUT));
  });

  it('ADS-02 the schedule, due count, run log and schedule change are refused signed out and to a member', () => {
    CONTROLS.forEach((c) => {
      cy.gqlRaw(c.query, {}, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
    });
    expectCallsRefused(memberToken, CONTROLS, ACCESS_DENIED);
  });

  it('ADS-03 Logs, Support and City Admin seats are refused every sweep control', () => {
    expectRolesRefused(OTHER_STAFF, CONTROLS);
  });
});
