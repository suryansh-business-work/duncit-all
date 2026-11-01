/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectPortalRefused } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * The AI console (ai.duncit.com, portal key `ai`): sign-in admits AI_MANAGER
 * (portals/portal.constants.ts) and every AI operation is SUPER_ADMIN +
 * AI_MANAGER — the prompt library (ai/prompt AI_RW), automation flows
 * (ai/automation AUTOMATION_ROLES), Reel Studio (ai/reel REEL_ROLES), the
 * OpenAI dashboard and rate card (ai/openaiUsage AI_USAGE_READ/WRITE) and the
 * AI Monitoring settings (ai/aiMonitoring MONITORING_WRITE). The call log, the
 * task catalogue and the image-scan log add the Logs console's seat
 * (LOGS_MANAGER, middleware/rbac.ts LOGS_READER); the upload notice
 * (aiMonitoringConfig) is public on purpose.
 *
 * AI_MANAGER cannot be granted to a run account (server e2eRun.staff.ts), so
 * the AI manager's own writes are not automated here; what is asserted is the
 * gate every other caller meets, and the reads the Logs seat shares. Every
 * refused write names an id no record has, or an input nothing is saved from.
 *
 * Scenario map: AI › Welcome page, AI Library, Automation flows, Reel Studio,
 * OpenAI Dashboard, OpenAI Logs, AI Monitoring logs, AI Monitoring settings.
 */

const ROLES: readonly E2eStaffRole[] = ['LOGS_MANAGER', 'CITY_ADMIN'];

const FLOW_INPUT = { input: { name: 'e2e refused flow', channel: 'WHATSAPP', nodes: [], edges: [] } };

/** Every AI-manager operation: refused to anyone without SUPER_ADMIN or AI_MANAGER. */
const AI_MANAGER_ONLY = [
  call('aiPrompts', `query E2eAiPrompts { aiPrompts { id } }`),
  call(
    'createAiPrompt',
    `mutation E2eCreateAiPrompt { createAiPrompt(input: { name: "e2e refused", content: "e2e refused prompt body" }) { id } }`,
  ),
  call('resetAiPrompt', `mutation E2eResetAiPrompt($id: ID!) { resetAiPrompt(id: $id) { id } }`, { id: NO_ID }),
  call('deleteAiPrompt', `mutation E2eDeleteAiPrompt($id: ID!) { deleteAiPrompt(id: $id) }`, { id: NO_ID }),
  call('automationFlows', `query E2eAutomationFlows { automationFlows(channel: WHATSAPP) { id } }`),
  call(
    'saveAutomationFlow',
    `mutation E2eSaveFlow($input: SaveAutomationFlowInput!) { saveAutomationFlow(input: $input) { id } }`,
    FLOW_INPUT,
  ),
  call(
    'setAutomationFlowStatus',
    `mutation E2eFlowStatus($id: ID!) { setAutomationFlowStatus(id: $id, status: ACTIVE) { id } }`,
    { id: NO_ID },
  ),
  call(
    'resumeAutomationTest',
    `mutation E2eResumeTest($id: ID!) { resumeAutomationTest(input: { run_id: $id, timed_out: true }) { id } }`,
    { id: NO_ID },
  ),
  call('reelProjects', `query E2eReelProjects { reelProjects { __typename } }`),
  call('createReelProject', `mutation E2eCreateReel { createReelProject(input: { name: "e2e refused" }) { id } }`),
  call('openAiUsageDashboard', `query E2eOpenAiDashboard { openAiUsageDashboard(range_days: 7) { range_days } }`),
  call(
    'upsertOpenAiModelPrice',
    `mutation E2eUpsertPrice { upsertOpenAiModelPrice(input: { model: "e2e-refused", input_per_1m: 0, output_per_1m: 0 }) { id } }`,
  ),
  call('aiMonitoringSettings', `query E2eAiMonitoringSettings { aiMonitoringSettings { image_prompt_key } }`),
  call(
    'updateAiMonitoringSettings',
    `mutation E2eUpdateAiMonitoring { updateAiMonitoringSettings(input: {}) { chip_enabled } }`,
  ),
];

/** The logs the Logs console reads too. */
const SHARED_LOGS = [
  call('openAiUsageLogsTable', `query E2eOpenAiLogs { openAiUsageLogsTable(query: { page_size: 1 }) { total } }`),
  call('openAiTaskCatalogue', `query E2eOpenAiTasks { openAiTaskCatalogue { modules } }`),
  call('aiMonitoringLogsTable', `query E2eAiScanLogs { aiMonitoringLogsTable(query: { page_size: 1 }) { total } }`),
];

const OPENAI_LOGS = call(
  'openAiUsageLogsTable',
  `query E2eOpenAiLogPage { openAiUsageLogsTable(query: { page_size: 20 }) {
    total page_size rows { id status task model cost_usd priced prompt_tokens completion_tokens total_tokens }
  } }`,
);
const TASKS = call('openAiTaskCatalogue', `query E2eOpenAiTaskList { openAiTaskCatalogue { tasks { key label module } modules } }`);
const SCAN_LOGS = call(
  'aiMonitoringLogsTable',
  `query E2eAiScanLogPage { aiMonitoringLogsTable(query: { page_size: 20 }) { total rows { id url status risk action } } }`,
);
const MONITORING_CONFIG = `query E2eAiMonitoringConfig { aiMonitoringConfig { chip_enabled chip_label dialog_title dialog_points } }`;

interface OpenAiRow {
  status: string;
  task: string;
  cost_usd: number;
  priced: boolean;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

describe('API · The AI console is the AI manager’s, its logs are shared with the Logs seat', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('AIC-01 a member cannot sign in to the AI console, and a signed-out caller is refused every AI write', () => {
    expectPortalRefused('ai');
    AI_MANAGER_ONLY.forEach((c) => {
      cy.gqlRaw(c.query, c.variables ?? {}, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
    });
    expectCallsRefused(memberToken, [...AI_MANAGER_ONLY, ...SHARED_LOGS]);
  });

  it('AIC-02 CITY_ADMIN is turned away at the AI sign-in and refused every AI operation and log', () => {
    asRole('CITY_ADMIN', (token) => {
      expectPortalRefused('ai');
      expectCallsRefused(token, [...AI_MANAGER_ONLY, ...SHARED_LOGS]);
    });
  });

  it('AIC-03 LOGS_MANAGER cannot sign in to the AI console nor touch the library, flows, reels, rate card or settings', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectPortalRefused('ai');
      expectCallsRefused(token, AI_MANAGER_ONLY);
    });
  });

  it('AIC-04 LOGS_MANAGER reads the OpenAI call log: known statuses, no tokens on a skipped call, an unpriced call costed at zero', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<{ total: number; page_size: number; rows: OpenAiRow[] }>(token, OPENAI_LOGS).then((page) => {
        expect(page.total, 'calls logged').to.be.at.least(page.rows.length);
        expect(page.rows.length, 'one page at most').to.be.at.most(page.page_size);
        page.rows.forEach((row) => {
          expect(['SUCCESS', 'FAILED', 'SKIPPED'], `status of ${row.task}`).to.include(row.status);
          if (row.status === 'SKIPPED') expect(row.total_tokens, 'a call never sent used no tokens').to.equal(0);
          expect(row.cost_usd, 'cost').to.be.at.least(0);
          if (!row.priced) expect(row.cost_usd, 'a model without a rate is costed at zero').to.equal(0);
        });
      });
      expectRead<{ tasks: Array<{ key: string; module: string }>; modules: string[] }>(token, TASKS).then((catalogue) => {
        expect(catalogue.tasks, 'catalogue tasks').to.not.be.empty;
        const modules = [...new Set(catalogue.tasks.map((task) => task.module))].sort((a, b) => a.localeCompare(b));
        expect(catalogue.modules, 'the Area filter offers exactly the tasks’ modules').to.deep.equal(modules);
      });
      cy.gqlRaw(`query E2eOpenAiLog($id: ID!) { openAiUsageLog(id: $id) { id } }`, { id: NO_ID }, { token }).then((body) => {
        expect(body.errors, 'an unknown call').to.be.undefined;
        expect(body.data?.openAiUsageLog, 'an id no call has opens nothing').to.be.null;
      });
    });
  });

  it('AIC-05 LOGS_MANAGER reads the uploaded-image checks, each with an image link and a status', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<{ total: number; rows: Array<{ url: string; status: string }> }>(token, SCAN_LOGS).then((page) => {
        expect(page.total, 'checks logged').to.be.at.least(page.rows.length);
        page.rows.forEach((row) => {
          expect(row.url, 'the checked image').to.match(/^https?:\/\//);
          expect(row.status, 'monitoring status').to.be.a('string').and.not.be.empty;
        });
      });
    });
  });

  it('AIC-06 the upload notice every upload field reads is public: blank copy falls to the shipped wording, bullets are trimmed and capped', () => {
    cy.gql<{
      aiMonitoringConfig: { chip_enabled: boolean; chip_label: string | null; dialog_title: string | null; dialog_points: string[] };
    }>(
      MONITORING_CONFIG,
      {},
      { token: null },
    ).then(({ aiMonitoringConfig }) => {
      expect(aiMonitoringConfig.chip_enabled, 'chip switch').to.be.a('boolean');
      [aiMonitoringConfig.chip_label, aiMonitoringConfig.dialog_title].forEach((copy) => {
        // null hands the field to the translated default; stored copy is trimmed and never blank.
        if (copy !== null) expect(copy, 'stored copy').to.equal(copy.trim()).and.not.equal('');
      });
      aiMonitoringConfig.dialog_points.forEach((point) => expect(point, 'a bullet is stored trimmed').to.equal(point.trim()));
      expect(aiMonitoringConfig.dialog_points, 'dialog bullets').to.be.an('array');
      expect(aiMonitoringConfig.dialog_points.length, 'twelve bullets at most').to.be.at.most(12);
      aiMonitoringConfig.dialog_points.forEach((point) => expect(point.trim(), 'no blank bullet').to.not.equal(''));
    });
  });
});
