/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { call, expectOutsidersRefused, expectRead, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Tech › App Builds, Package Updates, Account Deletions and Status Reports.
 *
 *   platform/appBuild  BUILDS_MANAGE, LISTING_MANAGE, RELEASES_MANAGE = SUPER_ADMIN, TECH_MANAGER;
 *                      appScreenshots is public (the websites show them)
 *   platform/packageUpdates TECH_MANAGE
 *   access/accountDeletion  TECH_REVIEW = SUPER_ADMIN, TECH_MANAGER for the queue and
 *                      the window; purges TECH_EXEC and the cron CRON_ADMIN = SUPER_ADMIN;
 *                      accountDeletionSettings is read by every signed-in member (the
 *                      delete-account screen quotes the window)
 *   platform/statusReport   STATUS_REPORT_ROLES = SUPER_ADMIN, TECH_MANAGER
 *
 * Every gate is the resolver's first statement. Writes carry ids no record has
 * (and a deletion window the service would refuse), so nothing is built,
 * pushed, purged or deleted even if a gate broke. Neither Tech role can be
 * granted to a run account, so the allowed half is not automated. Scenario map:
 * Staff › Tech: App Builds, Tech: Package Updates, Tech: Account Deletions,
 * Tech: Status Reports.
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'LOGS_MANAGER', 'SUPPORT_USER'];
const byId = { id: NO_ID };

const APP_BUILDS = [
  call('appBuildsTable', `query E2eBuilds { appBuildsTable(platform: ANDROID, query: { page_size: 1 }) { total } }`),
  call('appBuildSettings', `query E2eBuildSettings { appBuildSettings { __typename } }`),
  call('appBuildTriggerConfig', `query E2eBuildTrigger { appBuildTriggerConfig { __typename } }`),
  call('iosSigningBundle', `query E2eIosBundle { iosSigningBundle { __typename } }`),
  call('issueAppBuildCiToken', `mutation E2eCiToken { issueAppBuildCiToken { __typename } }`),
  call('updateAppBuildSettings', `mutation E2eBuildChannels { updateAppBuildSettings(input: { android_channel: "abc" }) { __typename } }`),
  call('deleteAppBuild', `mutation E2eDeleteBuild($id: ID!) { deleteAppBuild(id: $id) }`, byId),
  call('pushAppBuildToPlayStore', `mutation E2ePushPlay($id: ID!) { pushAppBuildToPlayStore(id: $id, track: INTERNAL) { __typename } }`, byId),
  call('generateIosSigning', `mutation E2eIosSigning { generateIosSigning { __typename } }`),
  call('storeListing', `query E2eStoreListing { storeListing { __typename } }`),
  call('updateStoreListing', `mutation E2eUpdateListing { updateStoreListing(input: { support_url: "http://x" }) { __typename } }`),
  call('storeReleases', `query E2eStoreReleases { storeReleases(store: GOOGLE_PLAY) { __typename } }`),
  call('resolveStoreIssue', `mutation E2eResolveIssue($id: ID!) { resolveStoreIssue(id: $id) { __typename } }`, byId),
  call('submitLatestBuildToStore', `mutation E2eSubmitLatest { submitLatestBuildToStore(store: GOOGLE_PLAY) { __typename } }`),
];

const PACKAGE_UPDATES = [
  call('techPackageUpdates', `query E2ePackages { techPackageUpdates { __typename } }`),
  call('techRefreshPackageUpdates', `mutation E2eRefreshPackages { techRefreshPackageUpdates { __typename } }`),
];

const DELETIONS = [
  call('accountDeletionRequestsTable', `query E2eDeletionQueue { accountDeletionRequestsTable(query: { page_size: 1 }) { total } }`),
  call('accountDeletionRequest', `query E2eDeletionRequest($id: ID!) { accountDeletionRequest(request_doc_id: $id) { __typename } }`, byId),
  call('accountDeletionCronSettings', `query E2eDeletionCron { accountDeletionCronSettings { __typename } }`),
  call('accountDeletionDueCount', `query E2eDeletionDue { accountDeletionDueCount }`),
  call('updateAccountDeletionSettings', `mutation E2eDeletionWindow { updateAccountDeletionSettings(retention_days: 400) { retention_days } }`),
  call('rejectAccountDeletionRequest', `mutation E2eRejectDeletion($id: ID!) { rejectAccountDeletionRequest(request_doc_id: $id, note: "e2e") { __typename } }`, byId),
  call(
    'purgeAccountTrace',
    `mutation E2ePurgeTrace($id: ID!) { purgeAccountTrace(input: { request_doc_id: $id, model_name: "Ticket", field_path: "user_id" }) { __typename } }`,
    byId,
  ),
  call('purgeAccountCompletely', `mutation E2ePurgeAll($id: ID!) { purgeAccountCompletely(request_doc_id: $id) { __typename } }`, byId),
  call('updateAccountDeletionCron', `mutation E2eDeletionCronSave { updateAccountDeletionCron(input: {}) { __typename } }`),
  call('runAccountDeletionPurgeNow', `mutation E2ePurgeNow { runAccountDeletionPurgeNow { __typename } }`),
];

const STATUS_REPORTS = [
  call('statusReportsTable', `query E2eStatusReports { statusReportsTable(query: { page_size: 1 }) { total } }`),
  call('deleteStatusReports', `mutation E2eDeleteReports($id: ID!) { deleteStatusReports(ids: [$id]) }`, byId),
];

const DELETION_WINDOW = call('accountDeletionSettings', `query E2eDeletionWindowRead { accountDeletionSettings { retention_days } }`);
const SCREENSHOTS = `query E2eAppScreenshots { appScreenshots }`;

describe('API · Builds, package updates, deletions and status reports are Tech-only', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('TR-01 builds, store pushes, signing, the store listing and releases refuse outsiders and other consoles', () => {
    expectOutsidersRefused(memberToken, APP_BUILDS);
    expectRolesRefused(ROLES, APP_BUILDS);
  });

  it('TR-02 the app screenshots the websites show are public, and every one is an https URL', () => {
    cy.gqlRaw(SCREENSHOTS, {}, { token: null }).then((body) => {
      expect(body.errors, 'appScreenshots errors').to.be.undefined;
      const urls = body.data?.appScreenshots as string[];
      expect(urls, 'appScreenshots').to.be.an('array');
      urls.forEach((url) => expect(url, 'screenshot URL').to.match(/^https:\/\//));
    });
  });

  it('TR-03 the package-update report and its refresh refuse outsiders and other consoles', () => {
    expectOutsidersRefused(memberToken, PACKAGE_UPDATES);
    expectRolesRefused(ROLES, PACKAGE_UPDATES);
  });

  it('TR-04 a member reads the deletion window (1-365 days); signed out it is refused', () => {
    expectRead<{ retention_days: number }>(memberToken, DELETION_WINDOW).then(({ retention_days }) => {
      expect(Number.isInteger(retention_days), 'whole days').to.equal(true);
      expect(retention_days, 'retention_days').to.be.within(1, 365);
    });
    cy.gqlRaw(DELETION_WINDOW.query, {}, { token: null }).then((body) =>
      expectRefused(DELETION_WINDOW.field, body, SIGNED_OUT),
    );
  });

  it('TR-05 the deletion queue, the window, rejects, purges and the purge cron refuse outsiders and other consoles', () => {
    expectOutsidersRefused(memberToken, DELETIONS);
    expectRolesRefused(ROLES, DELETIONS);
  });

  it('TR-06 status reports cannot be listed or deleted outside Tech', () => {
    expectOutsidersRefused(memberToken, STATUS_REPORTS);
    expectRolesRefused(ROLES, STATUS_REPORTS);
  });
});
