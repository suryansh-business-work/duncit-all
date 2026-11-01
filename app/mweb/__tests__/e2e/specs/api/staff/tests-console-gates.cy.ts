/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import {
  asRole,
  call,
  expectCallsRefused,
  expectOutsidersRefused,
  expectRead,
  expectRolesRefused,
  NO_ID,
} from '../../../support/api-staff';

/**
 * The pages that moved from Tech to the Tests console (tests.duncit.com): E2E
 * Flows, E2E Settings, GraphQL Monitor, Stress Testing and Telemetry. The server
 * lets SUPER_ADMIN, TECH_MANAGER and TESTS_MANAGER in, and nobody else:
 *
 *   platform/e2eFlow   E2E_MANAGE = SUPER_ADMIN, TECH_MANAGER, TESTS_MANAGER
 *   platform/e2eRun    E2E_CONSOLE (same three) for the settings and runs
 *   platform/graphqlMonitor MANAGE (same three)
 *   platform/stressTest     STRESS_CONSOLE (same three)
 *   platform/telemetry TELEMETRY_READ / _WRITE (same three); LOG_READ adds LOGS_MANAGER
 *                      to the logs and their settings; rotating the feed key is SUPER_ADMIN's
 *
 * Every gate is the resolver's first statement. Nothing is written: writes
 * name ids nothing has, an empty import, an empty settings patch, or monitor
 * settings the service refuses (150% sampling). None of the three allowed roles
 * can be granted to a run account. Scenario map: Staff › Tech: E2E Flows, Tech:
 * E2E Settings, Tech: GraphQL Monitor, Tech: Stress Testing, Tech: Telemetry.
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'LOGS_MANAGER', 'COMMUNICATIONS_MANAGER'];
const byId = { id: NO_ID };
const LEVELS = ['debug', 'info', 'warn', 'error'];

const FLOWS = [
  call('e2eFlowsTable', `query E2eFlowsTable { e2eFlowsTable(query: { page_size: 1 }) { total } }`),
  call('e2eFlow', `query E2eFlowOne($id: ID!) { e2eFlow(id: $id) { id } }`, byId),
  call('createE2eFlow', `mutation E2eFlowCreate { createE2eFlow(input: { name: "x" }) { id } }`),
  call('updateE2eFlow', `mutation E2eFlowUpdate($id: ID!) { updateE2eFlow(id: $id, input: { name: "E2E never saved" }) { id } }`, byId),
  call('deleteE2eFlow', `mutation E2eFlowDelete($id: ID!) { deleteE2eFlow(id: $id) }`, byId),
  call('deleteE2eSubFlow', `mutation E2eSubFlowDelete($id: ID!) { deleteE2eSubFlow(flow_id: $id, sub_flow_id: $id) { id } }`, byId),
];

const E2E_SETTINGS = [
  call('e2eRunSettings', `query E2eSettingsRead { e2eRunSettings { __typename } }`),
  call('e2eSuiteCatalogue', `query E2eSuites { e2eSuiteCatalogue { __typename } }`),
  call('e2eTriggerConfig', `query E2eTrigger { e2eTriggerConfig { __typename } }`),
  call('e2eRunsTable', `query E2eRuns { e2eRunsTable(query: { page_size: 1 }) { total } }`),
];

const GRAPHQL_MONITOR = [
  call('graphqlMonitorOverview', `query E2eGqlOverview { graphqlMonitorOverview(range: "LAST_24_HOURS") { __typename } }`),
  call('graphqlMonitorOperations', `query E2eGqlOperations { graphqlMonitorOperations { __typename } }`),
  call('graphqlMonitorErrors', `query E2eGqlErrors { graphqlMonitorErrors { __typename } }`),
  call('graphqlMonitorSettings', `query E2eGqlSettings { graphqlMonitorSettings { __typename } }`),
  call(
    'updateGraphqlMonitorSettings',
    `mutation E2eGqlSave { updateGraphqlMonitorSettings(input: { enabled: true, field_sample_pct: 150, retention_days: 14, slow_threshold_ms: 20 }) { __typename } }`,
  ),
];

const STRESS = [
  call('stressSettings', `query E2eStressSettings { stressSettings { __typename } }`),
  call('stressTriggerConfig', `query E2eStressTrigger { stressTriggerConfig { __typename } }`),
  call('serverPulse', `query E2ePulse { serverPulse { __typename } }`),
  call('stopStressRun', `mutation E2eStressStop($id: ID!) { stopStressRun(id: $id) { __typename } }`, byId),
  call('deleteStressRun', `mutation E2eStressDelete($id: ID!) { deleteStressRun(id: $id) }`, byId),
  call('generateStressVerdict', `mutation E2eStressVerdict($id: ID!) { generateStressVerdict(id: $id) { __typename } }`, byId),
];

const TELEMETRY_SETTINGS = call(
  'telemetrySettings',
  `query E2eTelemetrySettings { telemetrySettings { persisted_levels retention_days } }`,
);
const TELEMETRY_TECH = [
  call('telemetryDashboard', `query E2eTelemetryDashboard { telemetryDashboard(range_days: 1) { __typename } }`),
  call('bugsTable', `query E2eBugs { bugsTable(query: { page_size: 1 }) { total } }`),
  call('bug', `query E2eBug($id: ID!) { bug(id: $id) { __typename } }`, byId),
  call('updateBugStatus', `mutation E2eBugStatus($id: ID!) { updateBugStatus(bug_id: $id, status: "RESOLVED") { __typename } }`, byId),
  call('updateTelemetrySettings', `mutation E2eTelemetrySave { updateTelemetrySettings(input: {}) { __typename } }`),
  call('importBugs', `mutation E2eImportBugs { importBugs(bugs: []) { __typename } }`),
  call('rotateTelemetryApiKey', `mutation E2eRotateKey { rotateTelemetryApiKey { __typename } }`),
];

describe('API · Tests console pages are for Tech and Tests staff only', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('TC-01 the flow catalogue and its edits refuse outsiders and other consoles, so no flow is written', () => {
    expectOutsidersRefused(memberToken, FLOWS);
    expectRolesRefused(ROLES, FLOWS);
  });

  it('TC-02 the E2E schedule, suites, trigger config and runs refuse outsiders and other consoles', () => {
    expectOutsidersRefused(memberToken, E2E_SETTINGS);
    expectRolesRefused(ROLES, E2E_SETTINGS);
  });

  it('TC-03 the GraphQL monitor and its settings refuse outsiders and other consoles', () => {
    expectOutsidersRefused(memberToken, GRAPHQL_MONITOR);
    expectRolesRefused(ROLES, GRAPHQL_MONITOR);
  });

  it('TC-04 stress settings, the live pulse and run controls refuse outsiders and other consoles', () => {
    expectOutsidersRefused(memberToken, STRESS);
    expectRolesRefused(ROLES, STRESS);
  });

  it('TC-05 LOGS_MANAGER reads the log-retention settings but not the dashboard, bugs, triage, imports or key rotation', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<{ persisted_levels: string[]; retention_days: number }>(token, TELEMETRY_SETTINGS).then((settings) => {
        settings.persisted_levels.forEach((level) => expect(LEVELS, 'persisted level').to.include(level));
        expect(settings.retention_days, 'retention_days').to.be.within(1, 90);
      });
      expectCallsRefused(token, TELEMETRY_TECH);
    });
  });

  it('TC-06 telemetry refuses outsiders, and CITY_ADMIN even the settings', () => {
    expectOutsidersRefused(memberToken, [TELEMETRY_SETTINGS, ...TELEMETRY_TECH]);
    asRole('CITY_ADMIN', (token) => expectCallsRefused(token, [TELEMETRY_SETTINGS, ...TELEMETRY_TECH]));
  });
});
