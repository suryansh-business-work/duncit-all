/**
 * Staff-only GraphQL operations the run account must be refused, grouped by the
 * console that owns them (each group is one spec under specs/api/staff/).
 *
 * Every entry was checked against its resolver: the role guard
 * (server/src/middleware/rbac.ts `requireRole`, or `requireStoreAdmin`) is the
 * FIRST statement, before any lookup or input validation, so the dummy id below
 * can only ever produce the auth refusal — never a not-found that would let a
 * broken guard pass unnoticed. Inputs are the smallest that pass GraphQL
 * validation; operations behind the product feature flag are left out because
 * the flag answers before the guard does.
 */

export type StaffArea =
  | 'Finance'
  | 'Admin'
  | 'Tech'
  | 'Ecomm store'
  | 'Logs'
  | 'Support'
  | 'Legal'
  | 'CRM'
  | 'Communications'
  | 'E2E testing API'
  | 'Venues'
  | 'Hosts'
  | 'Club admins'
  | 'Onboarding'
  | 'Pods';

export interface StaffOperation {
  /** Scenario id, stable across runs. */
  id: string;
  area: StaffArea;
  /** The root field — the one `data` must not carry. */
  field: string;
  query: string;
  variables?: Record<string, unknown>;
}

/** An ObjectId no record has. */
export const NO_ID = '000000000000000000000000';
const byId = { id: NO_ID };
/** A stamp that is no run's, and an address that is no account's: harmless even if a guard broke. */
const NO_STAMP = '010120260000';
const NO_EMAIL = 'nobody@example.com';

const op = (
  id: string,
  area: StaffArea,
  field: string,
  query: string,
  variables?: Record<string, unknown>,
): StaffOperation => ({ id, area, field, query, variables });

export const STAFF_OPERATIONS: readonly StaffOperation[] = [
  // Finance — refunds, payouts, withdrawals and the money settings.
  op('SA-01', 'Finance', 'refundPayment', `mutation E2eRefundPayment($id: ID!) { refundPayment(payment_doc_id: $id, reason: "e2e") { __typename } }`, byId),
  op('SA-02', 'Finance', 'retryPaymentSteps', `mutation E2eRetryPaymentSteps($id: ID!) { retryPaymentSteps(payment_doc_id: $id) { __typename } }`, byId),
  op('SA-03', 'Finance', 'paymentsTable', `query E2ePaymentsTable { paymentsTable(query: {}) { __typename } }`),
  op('SA-04', 'Finance', 'userRefundsTable', `query E2eUserRefundsTable { userRefundsTable(query: {}) { __typename } }`),
  op('SA-05', 'Finance', 'approvePodPaymentRelease', `mutation E2eApproveRelease($id: ID!) { approvePodPaymentRelease(id: $id) { __typename } }`, byId),
  op('SA-06', 'Finance', 'podPaymentRelease', `query E2ePodPaymentRelease($id: ID!) { podPaymentRelease(id: $id) { __typename } }`, byId),
  op('SA-07', 'Finance', 'setHostDeductions', `mutation E2eSetHostDeductions($id: ID!) { setHostDeductions(user_id: $id, host_commission_pct: 0) }`, byId),
  op('SA-08', 'Finance', 'reviewWithdrawal', `mutation E2eReviewWithdrawal($id: ID!) { reviewWithdrawal(withdrawal_id: $id, input: { status: REJECTED }) { __typename } }`, byId),
  op('SA-09', 'Finance', 'withdrawalRequestsTable', `query E2eWithdrawalRequests { withdrawalRequestsTable(query: {}) { __typename } }`),
  op('SA-10', 'Finance', 'updateFoodTaxDefaults', `mutation E2eUpdateFoodTax { updateFoodTaxDefaults(input: { tax_mode: INCLUSIVE, gst_pct: 5 }) { __typename } }`),
  op('SA-11', 'Finance', 'updateCoinSettings', `mutation E2eUpdateCoinSettings { updateCoinSettings(input: {}) { __typename } }`),
  op('SA-12', 'Finance', 'financeSettings', `query E2eFinanceSettings { financeSettings { __typename } }`),
  op('SA-31', 'Finance', 'coinSettings', `query E2eCoinSettings { coinSettings { __typename } }`),
  op('SA-32', 'Finance', 'foodTaxDefaults', `query E2eFoodTaxDefaults { foodTaxDefaults { __typename } }`),
  op('SA-33', 'Finance', 'updateWithdrawalMinimums', `mutation E2eWithdrawalMinimums { updateWithdrawalMinimums(input: {}) { __typename } }`),
  // Admin — roles, platform data and settings.
  op('SA-13', 'Admin', 'grantAdminAccess', `mutation E2eGrantAdminAccess($id: ID!) { grantAdminAccess(user_id: $id) { __typename } }`, byId),
  op('SA-14', 'Admin', 'deleteRole', `mutation E2eDeleteRole($id: ID!) { deleteRole(role_id: $id) }`, byId),
  op('SA-15', 'Admin', 'dashboardTotals', `query E2eDashboardTotals { dashboardTotals { __typename } }`),
  op('SA-16', 'Admin', 'userActivityYear', `query E2eUserActivityYear($id: ID!) { userActivityYear(user_id: $id) { __typename } }`, byId),
  op('SA-17', 'Admin', 'deleteCategory', `mutation E2eDeleteCategory($id: ID!) { deleteCategory(category_id: $id) }`, byId),
  op('SA-18', 'Admin', 'updateBranding', `mutation E2eUpdateBranding { updateBranding(input: {}) { __typename } }`),
  op('SA-19', 'Admin', 'setPortalAppFeatures', `mutation E2eSetPortalAppFeatures { setPortalAppFeatures(key: "admin") { __typename } }`),
  op('SA-34', 'Admin', 'revokeAdminAccess', `mutation E2eRevokeAdminAccess($id: ID!) { revokeAdminAccess(user_id: $id) { __typename } }`, byId),
  op('SA-35', 'Admin', 'rolesTable', `query E2eRolesTable { rolesTable(query: {}) { __typename } }`),
  op('SA-36', 'Admin', 'deleteBadge', `mutation E2eDeleteBadge($id: ID!) { deleteBadge(badge_doc_id: $id) }`, byId),
  op('SA-37', 'Admin', 'membershipPlans', `query E2eMembershipPlans { membershipPlans { __typename } }`),
  op('SA-38', 'Admin', 'deleteMembershipPlan', `mutation E2eDeleteMembershipPlan($id: ID!) { deleteMembershipPlan(plan_id: $id) }`, byId),
  op('SA-39', 'Admin', 'appSettings', `query E2eAppSettings { appSettings { __typename } }`),
  op('SA-40', 'Admin', 'portalModes', `query E2ePortalModes { portalModes { __typename } }`),
  // Tech — server, DNS, backups and the e2e settings themselves.
  op('SA-20', 'Tech', 'e2eRunSettings', `query E2eRunSettingsRefusal { e2eRunSettings { __typename } }`),
  op('SA-21', 'Tech', 'techServerInfo', `query E2eTechServerInfo { techServerInfo { __typename } }`),
  op('SA-22', 'Tech', 'dnsZone', `query E2eDnsZone { dnsZone { __typename } }`),
  op('SA-23', 'Tech', 'deleteDbBackup', `mutation E2eDeleteDbBackup($id: ID!) { deleteDbBackup(id: $id) { __typename } }`, byId),
  op('SA-41', 'Tech', 'techDockerInfo', `query E2eTechDockerInfo { techDockerInfo { __typename } }`),
  op('SA-42', 'Tech', 'dnsDomainInfo', `query E2eDnsDomainInfo { dnsDomainInfo { __typename } }`),
  op('SA-43', 'Tech', 'dbBackupSettings', `query E2eDbBackupSettings { dbBackupSettings { __typename } }`),
  op('SA-44', 'Tech', 'deleteE2eRun', `mutation E2eDeleteE2eRun($id: ID!) { deleteE2eRun(id: $id) }`, byId),
  // Ecomm store admin (ecomm.duncit.com) — orders, coupons and store settings.
  op('SA-24', 'Ecomm store', 'storeOrdersTable', `query E2eStoreOrdersTable { storeOrdersTable(query: {}) { __typename } }`),
  op('SA-25', 'Ecomm store', 'storeAdminOrder', `query E2eStoreAdminOrder($id: ID!) { storeAdminOrder(id: $id) { __typename } }`, byId),
  op('SA-45', 'Ecomm store', 'storeAdminSettings', `query E2eStoreAdminSettings { storeAdminSettings { __typename } }`),
  op('SA-46', 'Ecomm store', 'storeDeleteCoupon', `mutation E2eStoreDeleteCoupon($id: ID!) { storeDeleteCoupon(id: $id) }`, byId),
  // Logs.
  op('SA-26', 'Logs', 'telemetryLogsTable', `query E2eTelemetryLogs { telemetryLogsTable(query: {}) { __typename } }`),
  op('SA-47', 'Logs', 'bugsTable', `query E2eBugsTable { bugsTable(query: {}) { __typename } }`),
  op('SA-48', 'Logs', 'deleteBugs', `mutation E2eDeleteBugs($ids: [ID!]!) { deleteBugs(ids: $ids) }`, { ids: [NO_ID] }),
  op('SA-49', 'Logs', 'emailLogsTable', `query E2eEmailLogsTable { emailLogsTable(query: {}) { __typename } }`),
  // Support.
  op('SA-27', 'Support', 'tickets', `query E2eAllTickets { tickets { __typename } }`),
  op('SA-50', 'Support', 'assignTicket', `mutation E2eAssignTicket($id: ID!) { assignTicket(ticket_id: $id) { __typename } }`, byId),
  op('SA-51', 'Support', 'reportedProblemsTable', `query E2eReportedProblemsTable { reportedProblemsTable(query: {}) { __typename } }`),
  // Legal.
  op('SA-28', 'Legal', 'contractsTable', `query E2eContractsTable { contractsTable(query: {}) { __typename } }`),
  op('SA-52', 'Legal', 'deleteContract', `mutation E2eDeleteContract($id: ID!) { deleteContract(id: $id) }`, byId),
  op('SA-53', 'Legal', 'grievanceStats', `query E2eGrievanceStats { grievanceStats { __typename } }`),
  op('SA-54', 'Legal', 'legalDocumentsTable', `query E2eLegalDocumentsTable { legalDocumentsTable(query: {}) { __typename } }`),
  op('SA-55', 'Legal', 'deleteLegalDocument', `mutation E2eDeleteLegalDocument($id: ID!) { deleteLegalDocument(id: $id) }`, byId),
  // CRM.
  op('SA-29', 'CRM', 'venueLeadsTable', `query E2eVenueLeadsTable { venueLeadsTable(query: {}) { __typename } }`),
  op('SA-56', 'CRM', 'crmLeadConfig', `query E2eCrmLeadConfig { crmLeadConfig { __typename } }`),
  op('SA-57', 'CRM', 'deleteVenueLead', `mutation E2eDeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`, byId),
  // Communications — WhatsApp scenarios and email templates.
  op('SA-30', 'Communications', 'whatsappScenarios', `query E2eWhatsappScenarios { whatsappScenarios { __typename } }`),
  op('SA-58', 'Communications', 'reconcileWhatsappScenarios', `mutation E2eReconcileWhatsapp { reconcileWhatsappScenarios { __typename } }`),
  op('SA-59', 'Communications', 'emailTemplates', `query E2eEmailTemplates { emailTemplates { __typename } }`),
  // The e2e testing API itself — codes, traffic keys, Google stand-ins, purge, role grants.
  op('SA-60', 'E2E testing API', 'e2eOneTimeCode', `query E2eCodeRefusal($email: String) { e2eOneTimeCode(purpose: "LOGIN", email: $email) { __typename } }`, { email: NO_EMAIL }),
  op('SA-61', 'E2E testing API', 'e2eTrafficKey', `query E2eTrafficKeyRefusal($stamp: String!) { e2eTrafficKey(stamp: $stamp) }`, { stamp: NO_STAMP }),
  op('SA-62', 'E2E testing API', 'e2eGoogleCredential', `query E2eGoogleRefusal($email: String!) { e2eGoogleCredential(email: $email, given_name: "No", family_name: "Body") }`, { email: NO_EMAIL }),
  op('SA-63', 'E2E testing API', 'purgeE2eRunData', `mutation E2ePurgeRefusal($input: PurgeE2eRunDataInput!) { purgeE2eRunData(input: $input) { __typename } }`, { input: { stamp: NO_STAMP, signup_email: NO_EMAIL } }),
  op('SA-64', 'E2E testing API', 'grantE2eRunAccountRoles', `mutation E2eGrantRefusal($input: GrantE2eRunAccountRolesInput!) { grantE2eRunAccountRoles(input: $input) }`, { input: { stamp: NO_STAMP, email: NO_EMAIL, roles: ['SUPPORT_MANAGER'] } }),
  // Venues console (ALL_VENUES_ACCESS; approvals are platform + onboarding).
  op('SA-65', 'Venues', 'venuesTable', `query E2eVenuesTable { venuesTable(query: {}) { __typename } }`),
  op('SA-66', 'Venues', 'venue', `query E2eVenue($id: ID!) { venue(venue_doc_id: $id) { __typename } }`, byId),
  op('SA-67', 'Venues', 'approveVenue', `mutation E2eApproveVenue($id: ID!) { approveVenue(venue_doc_id: $id) { __typename } }`, byId),
  op('SA-68', 'Venues', 'setVenueActive', `mutation E2eSetVenueActive($id: ID!) { setVenueActive(venue_doc_id: $id, active: false) { __typename } }`, byId),
  // Hosts console (ALL_HOSTS_ACCESS; approvals are platform + onboarding).
  op('SA-69', 'Hosts', 'hostsTable', `query E2eHostsTable { hostsTable(query: {}) { __typename } }`),
  op('SA-70', 'Hosts', 'host', `query E2eHost($id: ID!) { host(host_doc_id: $id) { __typename } }`, byId),
  op('SA-71', 'Hosts', 'approveHost', `mutation E2eApproveHost($id: ID!) { approveHost(host_doc_id: $id) { __typename } }`, byId),
  // Club admins console and the regional club admin's own region.
  op('SA-72', 'Club admins', 'clubAdminProfilesTable', `query E2eClubAdminProfiles { clubAdminProfilesTable(query: {}) { __typename } }`),
  op('SA-73', 'Club admins', 'approveClubAdminProfile', `mutation E2eApproveClubAdmin($id: ID!) { approveClubAdminProfile(id: $id) { __typename } }`, byId),
  op('SA-74', 'Club admins', 'myRegion', `query E2eMyRegion { myRegion { __typename } }`),
  // Onboarding console — host requests, meetings and identity verifications.
  op('SA-75', 'Onboarding', 'hostRequestsTable', `query E2eHostRequestsTable { hostRequestsTable(query: {}) { __typename } }`),
  op('SA-76', 'Onboarding', 'approveHostRequest', `mutation E2eApproveHostRequest($id: ID!) { approveHostRequest(id: $id) { __typename } }`, byId),
  op('SA-77', 'Onboarding', 'onboardingMeetingsTable', `query E2eOnboardingMeetings { onboardingMeetingsTable(query: {}) { __typename } }`),
  op('SA-78', 'Onboarding', 'userVerifications', `query E2eUserVerifications($id: ID!) { userVerifications(user_id: $id) { __typename } }`, byId),
  // Pods console — idea moderation, dashboard, delete and hide.
  op('SA-79', 'Pods', 'setPodIdeaStatus', `mutation E2eSetPodIdeaStatus($id: ID!) { setPodIdeaStatus(pod_idea_doc_id: $id, status: APPROVED) { __typename } }`, byId),
  op('SA-80', 'Pods', 'podDashboard', `query E2ePodDashboard { podDashboard { __typename } }`),
  op('SA-81', 'Pods', 'deletePod', `mutation E2eDeletePod($id: ID!) { deletePod(pod_doc_id: $id) }`, byId),
  op('SA-82', 'Pods', 'setPodHidden', `mutation E2eSetPodHidden($id: ID!) { setPodHidden(pod_doc_id: $id, hidden: true) { __typename } }`, byId),
];
