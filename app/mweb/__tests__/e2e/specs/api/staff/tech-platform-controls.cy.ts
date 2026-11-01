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
  expectTableRead,
  NO_ID,
} from '../../../support/api-staff';

/**
 * Tech › Authentication, Feature Flags, Google Analytics, Rate Limiting and Slack.
 *
 *   platform/settings        ADMIN_READ adds CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER;
 *                            ADMIN_WRITE = SUPER_ADMIN, TECH_MANAGER (JWT expiry, flags)
 *   platform/googleAnalytics TECH_MANAGE; googleAnalyticsTag is public (each website loads it)
 *   platform/rateLimit       MANAGE = SUPER_ADMIN, TECH_MANAGER; EVENTS_READ adds LOGS_MANAGER
 *   platform/slack           SLACK_READ adds TECH_MANAGER and TESTS_MANAGER to
 *                            SLACK_MANAGE = SUPER_ADMIN, COMMUNICATIONS_MANAGER
 *
 * Every gate is the resolver's first statement. Nothing is toggled: each write
 * names an id no flag or rule has, an empty import, or a measurement id the
 * service would refuse. Scenario map: Staff › Tech: Authentication, Tech:
 * Feature Flags, Tech: Google Analytics, Tech: Rate Limiting, Tech: Slack.
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'LOGS_MANAGER', 'COMMUNICATIONS_MANAGER'];
const byId = { id: NO_ID };
const WEBSITES = ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH', 'STATUS', 'ECOMM'] as const;

const APP_SETTINGS = call('appSettings', `query E2eAppSettings { appSettings { jwt_expires_in jwt_no_expiry } }`);
const FLAGS = call('featureFlags', `query E2eFlags { featureFlags { key enabled is_system } }`);
const SETTINGS_WRITES = [
  call('updateAppSettings', `mutation E2eJwt { updateAppSettings(input: { jwt_no_expiry: false, jwt_expires_in: "7d" }) { __typename } }`),
  call('createFeatureFlag', `mutation E2eNewFlag { createFeatureFlag(input: { key: "e2e_never_created", name: "E2E" }) { __typename } }`),
  call('setFeatureFlag', `mutation E2eToggleFlag($id: ID!) { setFeatureFlag(flag_id: $id, enabled: false) { __typename } }`, byId),
  call('deleteFeatureFlag', `mutation E2eDeleteFlag($id: ID!) { deleteFeatureFlag(flag_id: $id) }`, byId),
  call('importFeatureFlags', `mutation E2eImportFlags { importFeatureFlags(flags: []) { __typename } }`),
];

const GA_ADMIN = [
  call('googleAnalyticsSites', `query E2eGaSites { googleAnalyticsSites { site } }`),
  call(
    'saveGoogleAnalyticsSite',
    `mutation E2eGaSave { saveGoogleAnalyticsSite(input: { site: MAIN, measurement_id: "UA-123", enabled: true }) { site } }`,
  ),
  call('deleteGoogleAnalyticsSite', `mutation E2eGaDelete { deleteGoogleAnalyticsSite(site: STATUS) }`),
];
const GA_TAG = `query E2eGaTag($site: TrackedWebsite!) { googleAnalyticsTag(site: $site) }`;

const RATE_STATS = call('rateLimitStats', `query E2eRateStats { rateLimitStats { store blocked_24h monitored_24h } }`);
const RATE_OPTIONS = call('rateLimitOptions', `query E2eRateOptions { rateLimitOptions { channels algorithms modes } }`);
const RATE_EVENTS = call('rateLimitEventsTable', `query E2eRateEvents { rateLimitEventsTable(query: { page_size: 1 }) { total } }`);
const RATE_MANAGE = [
  call('rateLimitSettings', `query E2eRateSettings { rateLimitSettings { enabled } }`),
  call('rateLimitRulesTable', `query E2eRateRules { rateLimitRulesTable(query: { page_size: 1 }) { total } }`),
  call('rateLimitSystems', `query E2eRateSystems { rateLimitSystems { __typename } }`),
  call('updateRateLimitSettings', `mutation E2eRateSave { updateRateLimitSettings(input: { default_message: "abc" }) { enabled } }`),
  call('setRateLimitRuleEnabled', `mutation E2eRateToggle($id: ID!) { setRateLimitRuleEnabled(rule_id: $id, enabled: false) { __typename } }`, byId),
  call('deleteRateLimitRule', `mutation E2eRateDelete($id: ID!) { deleteRateLimitRule(rule_id: $id) }`, byId),
  call('resetRateLimitRuleCounters', `mutation E2eRateResetRule($id: ID!) { resetRateLimitRuleCounters(rule_id: $id) { __typename } }`, byId),
];

const SLACK_CONFIGURED = call('slackConfigured', `query E2eSlackConfigured { slackConfigured }`);
const SLACK_MANAGE = [
  call('slackChannelHistory', `query E2eSlackHistory { slackChannelHistory(channel: "C0000E2E00", limit: 1) { __typename } }`),
  call('slackPermissions', `query E2eSlackPermissions { slackPermissions { __typename } }`),
  call('sendSlackMessage', `mutation E2eSlackSend { sendSlackMessage(input: { channel: "C0000E2E00", blocks_json: "{" }) { __typename } }`),
  call('joinSlackChannel', `mutation E2eSlackJoin { joinSlackChannel(channel: "C0000E2E00") { __typename } }`),
];
const SLACK_READS = [SLACK_CONFIGURED, call('slackChannels', `query E2eSlackChannels { slackChannels { __typename } }`)];

describe('API · JWT expiry, flags, analytics tags, rate limits and Slack', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('TP-01 CITY_ADMIN reads the JWT setting and the flag list but is refused changing either', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ jwt_expires_in: string | null; jwt_no_expiry: boolean }>(token, APP_SETTINGS).then((settings) => {
        expect(settings.jwt_no_expiry, 'jwt_no_expiry').to.be.a('boolean');
        if (settings.jwt_expires_in !== null) expect(settings.jwt_expires_in, 'jwt_expires_in').to.be.a('string');
      });
      expectRead<Array<{ key: string; enabled: boolean; is_system: boolean }>>(token, FLAGS).then((flags) => {
        const keys = flags.map((f) => f.key);
        expect(new Set(keys).size, 'flag keys are unique').to.equal(keys.length);
        flags.forEach((f) => {
          expect(f.enabled, `${f.key} enabled`).to.be.a('boolean');
          expect(f.is_system, `${f.key} is_system`).to.be.a('boolean');
        });
      });
      expectCallsRefused(token, SETTINGS_WRITES);
    });
  });

  it('TP-02 a signed-out caller and a member are refused the settings, the flags and every write', () => {
    expectOutsidersRefused(memberToken, [APP_SETTINGS, FLAGS, ...SETTINGS_WRITES]);
  });

  it('TP-03 each website reads its GA4 tag signed out: none, or a G- measurement id', () => {
    WEBSITES.forEach((site) => {
      cy.gqlRaw(GA_TAG, { site }, { token: null }).then((body) => {
        expect(body.errors, `${site} tag errors`).to.be.undefined;
        const tag = body.data?.googleAnalyticsTag as string | null;
        if (tag !== null) expect(tag, `${site} tag`).to.match(/^G-[A-Z0-9]+$/);
      });
    });
  });

  it('TP-04 the GA site list, a save (even of a UA- id) and a removal are Tech-only', () => {
    expectOutsidersRefused(memberToken, GA_ADMIN);
    expectRolesRefused(ROLES, GA_ADMIN);
  });

  it('TP-05 LOGS_MANAGER reads breach counts, the rule options and breaches, but no rule, setting or counter', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<{ store: string; blocked_24h: number; monitored_24h: number }>(token, RATE_STATS).then((stats) => {
        expect(stats.store, 'counter store').to.be.a('string').and.not.be.empty;
        expect(stats.blocked_24h, 'blocked_24h').to.be.at.least(0);
        expect(stats.monitored_24h, 'monitored_24h').to.be.at.least(0);
      });
      expectRead<{ channels: string[]; algorithms: string[]; modes: string[] }>(token, RATE_OPTIONS).then((options) => {
        expect(options.channels, 'channels').to.deep.equal(['GRAPHQL', 'REST', 'SOCKET']);
        expect(options.algorithms, 'algorithms').to.have.members(['FIXED_WINDOW', 'SLIDING_WINDOW', 'TOKEN_BUCKET']);
        expect(options.modes, 'modes').to.have.members(['ENFORCE', 'MONITOR']);
      });
      expectTableRead(token, RATE_EVENTS);
      expectCallsRefused(token, RATE_MANAGE);
    });
  });

  it('TP-06 rate limiting refuses outsiders, and CITY_ADMIN even the breach log', () => {
    expectOutsidersRefused(memberToken, [RATE_STATS, RATE_EVENTS, ...RATE_MANAGE]);
    asRole('CITY_ADMIN', (token) => expectCallsRefused(token, [RATE_STATS, RATE_EVENTS, ...RATE_MANAGE]));
  });

  it('TP-07 COMMUNICATIONS_MANAGER reads whether Slack is connected; other consoles and outsiders are refused Slack', () => {
    asRole('COMMUNICATIONS_MANAGER', (token) => {
      expectRead<boolean>(token, SLACK_CONFIGURED).then((configured) => {
        expect(configured, 'slackConfigured').to.be.a('boolean');
      });
    });
    expectOutsidersRefused(memberToken, [...SLACK_READS, ...SLACK_MANAGE]);
    asRole('CITY_ADMIN', (token) => expectCallsRefused(token, [...SLACK_READS, ...SLACK_MANAGE]));
    asRole('LOGS_MANAGER', (token) => expectCallsRefused(token, [...SLACK_READS, ...SLACK_MANAGE]));
  });
});
