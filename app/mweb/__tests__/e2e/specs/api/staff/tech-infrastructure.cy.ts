/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectOutsidersRefused, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Tech › Server, Database, Domain and DNS, Security and Data Clone — every
 * operation behind those pages is SUPER_ADMIN and TECH_MANAGER only, and the
 * shell, the data clone and its connections are SUPER_ADMIN alone:
 *
 *   platform/tech/tech.resolver.ts            TECH_MANAGE, techExec TECH_EXEC
 *   platform/upload (media organizer)         MEDIA_ORGANIZER_ROLES
 *   platform/dns, portMap                     TECH_MANAGE
 *   platform/ssl, cloudflare                  TECH_MANAGE
 *   platform/dataClone/dataClone.resolver.ts  TECH_EXEC
 *
 * Each gate is the resolver's first statement, so a refused caller reaches no
 * lookup, no validation and no side effect. The writes below are aimed at ids
 * and records nothing has (and malformed DNS input), so even a broken gate
 * would have nothing to change. Neither TECH_MANAGER nor SUPER_ADMIN can be
 * granted to a run account: the allowed half of each page is not automated.
 * Scenario map: Staff › Tech: Server, Tech: Database, Tech: Domain and DNS,
 * Tech: Security, Tech: Data Clone.
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'LOGS_MANAGER', 'COMMUNICATIONS_MANAGER'];
const byId = { id: NO_ID };
/** A record that is in no zone: the DNS form would refuse its value long before GoDaddy saw it. */
const BAD_RECORD = { type: 'A', name: 'e2e-never-written', data: 'abc', ttl: 600 };

const SERVER = [
  call('techServerHistory', `query E2eServerHistory { techServerHistory(days: 30) { __typename } }`),
  call('techServerAdvice', `query E2eServerAdvice { techServerAdvice { __typename } }`),
  call('techDockerContainersTable', `query E2eDocker { techDockerContainersTable(query: { page_size: 1 }) { total } }`),
  call('techContainerLogs', `query E2eContainerLogs { techContainerLogs(name: "e2e-no-such-container", tail: 1) }`),
  call('techRestartContainer', `mutation E2eRestart { techRestartContainer(name: "e2e-no-such-container") { __typename } }`),
  call('techGenerateServerAdvice', `mutation E2eAdvice { techGenerateServerAdvice { __typename } }`),
  call('techExec', `mutation E2eExec { techExec(command: "echo e2e") { __typename } }`),
];

const DATABASE = [
  call('techDatabaseInfo', `query E2eDatabaseInfo { techDatabaseInfo { __typename } }`),
  call('techDatabaseCollectionsTable', `query E2eCollections { techDatabaseCollectionsTable(query: { page_size: 1 }) { total } }`),
  call('mediaOrganizerRuns', `query E2eOrganizerRuns { mediaOrganizerRuns(limit: 1) { __typename } }`),
  call('startMediaOrganizer', `mutation E2eOrganize { startMediaOrganizer(dry_run: true) { __typename } }`),
  call('applyMediaOrganizerRun', `mutation E2eApplyRun($id: ID!) { applyMediaOrganizerRun(run_id: $id) { __typename } }`, byId),
  call('rollbackMediaOrganizerRun', `mutation E2eRollback($id: ID!) { rollbackMediaOrganizerRun(run_id: $id) { __typename } }`, byId),
];

const DNS = [
  call('dnsDomainInfo', `query E2eDomainInfo { dnsDomainInfo { __typename } }`),
  call('portMappings', `query E2ePortMappings { portMappings { __typename } }`),
  call('addDnsRecord', `mutation E2eAddRecord($input: DnsRecordInput!) { addDnsRecord(input: $input) }`, { input: BAD_RECORD }),
  call(
    'updateDnsRecord',
    `mutation E2eUpdateRecord($ref: DnsRecordRef!, $input: DnsRecordInput!) { updateDnsRecord(ref: $ref, input: $input) }`,
    { ref: { type: 'A', name: 'e2e-never-written', data: '203.0.113.10' }, input: BAD_RECORD },
  ),
  call(
    'deleteDnsRecord',
    `mutation E2eDeleteRecord($ref: DnsRecordRef!) { deleteDnsRecord(ref: $ref) }`,
    { ref: { type: 'A', name: 'e2e-never-written', data: '203.0.113.10' } },
  ),
  call('syncStagingDns', `mutation E2eSyncStaging { syncStagingDns(ids: ["e2e-no-such-host"]) { __typename } }`),
];

const SECURITY = [
  call('sslCertificates', `query E2eSsl { sslCertificates { __typename } }`),
  call('sslLiveCheck', `query E2eSslLive { sslLiveCheck(name: "e2e-no-such-certificate") { __typename } }`),
  call('cloudflareMigration', `query E2eCloudflare { cloudflareMigration { __typename } }`),
  call('copyDnsToCloudflare', `mutation E2eCopyDns { copyDnsToCloudflare(ids: ["e2e-no-such-record"]) { __typename } }`),
  call('deleteCloudflareDnsRecord', `mutation E2eDeleteCfRecord { deleteCloudflareDnsRecord(id: "e2e-no-such-record") }`),
  call('checkCloudflareActivation', `mutation E2eCfRecheck { checkCloudflareActivation }`),
  call('setDomainNameServers', `mutation E2eNameServers { setDomainNameServers(target: CLOUDFLARE) }`),
];

const DATA_CLONE = [
  call('dataCloneTargets', `query E2eCloneTargets { dataCloneTargets { __typename } }`),
  call('dataCloneJob', `query E2eCloneJob { dataCloneJob { __typename } }`),
  call('dataCloneSettings', `query E2eCloneSettings { dataCloneSettings { __typename } }`),
  call('startDataClone', `mutation E2eStartClone { startDataClone { __typename } }`),
  call(
    'saveDataCloneConnection',
    `mutation E2eSaveClone { saveDataCloneConnection(role: STAGING, input: { uri: "http://x", database: "e2e" }) { __typename } }`,
  ),
  call('testDataCloneConnection', `mutation E2eTestClone { testDataCloneConnection(role: PRODUCTION) { __typename } }`),
];

describe('API · Server, database, DNS, security and data clone are Tech-only', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('TI-01 server metrics, containers, the AI advice and the shell refuse a signed-out caller, a member and other consoles', () => {
    expectOutsidersRefused(memberToken, SERVER);
    expectRolesRefused(ROLES, SERVER);
  });

  it('TI-02 database info and the media organizer runs are refused the same way, so no organizer run starts', () => {
    expectOutsidersRefused(memberToken, DATABASE);
    expectRolesRefused(ROLES, DATABASE);
  });

  it('TI-03 the domain, port mapping and every DNS write are refused, even a malformed record', () => {
    expectOutsidersRefused(memberToken, DNS);
    expectRolesRefused(ROLES, DNS);
  });

  it('TI-04 certificates and the Cloudflare move, nameservers included, are refused', () => {
    expectOutsidersRefused(memberToken, SECURITY);
    expectRolesRefused(ROLES, SECURITY);
  });

  it('TI-05 the data clone, its targets and its connections are refused, a malformed connection string included', () => {
    expectOutsidersRefused(memberToken, DATA_CLONE);
    expectRolesRefused(ROLES, DATA_CLONE);
  });
});
