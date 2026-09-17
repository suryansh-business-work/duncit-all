/**
 * Which portal tables offer bulk delete, and how one of their rows is deleted.
 *
 * A table joins by naming the single-row delete mutation its row bin already
 * calls. Nothing else is needed: the job reads the table's own scope through
 * its `<name>Table` query and deletes each row through that mutation, so every
 * entity keeps its own guards, cascades and change log. The portal picks the
 * table up by its query name — no page has to opt in.
 *
 * A table is listed only when its rows are read with `runTableQuery` (one
 * collection, one filter) and its delete takes the row's `_id` alone. Left out
 * on purpose, although a row delete exists:
 * - pods and users — a delete there refunds, emails attendees or closes an
 *   account, which is not something to fan out from one click;
 * - clubs and locations — a hard delete with nothing guarding the pods and
 *   profiles that point at the row;
 * - environment entries — one click would empty the server's configuration;
 * - hosts, venues, brands and club admin profiles — their delete asks for the
 *   caller's password;
 * - telemetry logs and bugs — they have their own bulk tools.
 *
 * `roles` decides who is offered the controls. It mirrors the mutation's own
 * gate, which still runs for every row — so a list wider than the mutation's
 * can only ever produce refusals, never a delete the person could not make.
 */
export interface BulkDeleteTarget {
  /** The mutation the row's own delete button calls. */
  mutation: string;
  /** Its id argument, when it is not `id`. */
  idArg?: string;
  roles: readonly string[];
}

const TECH = ['SUPER_ADMIN', 'TECH_MANAGER'];
const FINANCE = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
const LEGAL = ['SUPER_ADMIN', 'LEGAL_MANAGER'];
const WEBSITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'WEBSITE_MANAGER'];
const MARKETING = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];
const ADS = ['SUPER_ADMIN', 'MARKETING_MANAGER'];
const ADMIN = ['SUPER_ADMIN', 'CITY_ADMIN'];
const REGIONAL = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];
const ONBOARDING = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];
const CRM = ['SUPER_ADMIN', 'CRM_MANAGER'];
const PRODUCTS = ['SUPER_ADMIN', 'CITY_ADMIN', 'PRODUCTS_MANAGER'];
const COUPONS = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'FINANCE_MANAGER', 'MARKETING_MANAGER'];
const INVENTORY = { mutation: 'deleteInventoryProduct', idArg: 'product_doc_id', roles: PRODUCTS };

export const BULK_DELETE_TARGETS: Readonly<Record<string, BulkDeleteTarget>> = {
  // Tech
  appBuildsTable: { mutation: 'deleteAppBuild', roles: TECH },
  e2eRunsTable: { mutation: 'deleteE2eRun', roles: TECH },
  e2eFlowsTable: { mutation: 'deleteE2eFlow', roles: TECH },
  stressRunsTable: { mutation: 'deleteStressRun', roles: TECH },
  rateLimitRulesTable: { mutation: 'deleteRateLimitRule', idArg: 'rule_id', roles: TECH },
  featureFlagsTable: { mutation: 'deleteFeatureFlag', idArg: 'flag_id', roles: TECH },
  // Admin
  rolesTable: { mutation: 'deleteRole', idArg: 'role_id', roles: ['SUPER_ADMIN'] },
  userContactActionsTable: {
    mutation: 'deleteUserContactAction',
    idArg: 'action_id',
    roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'],
  },
  membershipPlansTable: { mutation: 'deleteMembershipPlan', idArg: 'plan_id', roles: ADMIN },
  membershipBenefitsTable: { mutation: 'deleteMembershipBenefit', idArg: 'benefit_id', roles: ADMIN },
  // Pods
  podPlansTable: { mutation: 'deletePodPlan', idArg: 'plan_id', roles: ADMIN },
  adminAutoPodsTable: { mutation: 'deleteAutoPod', idArg: 'auto_pod_doc_id', roles: REGIONAL },
  podIdeasTable: {
    mutation: 'deletePodIdea',
    idArg: 'pod_idea_doc_id',
    roles: [...REGIONAL, 'ALL_PODS_ACCESS'],
  },
  // Finance
  expensesTable: { mutation: 'deleteExpense', idArg: 'expense_doc_id', roles: FINANCE },
  podExpensesTable: { mutation: 'deletePodExpense', idArg: 'expense_doc_id', roles: FINANCE },
  couponsTable: { mutation: 'deleteCoupon', roles: COUPONS },
  couponsForPodTable: { mutation: 'deleteCoupon', roles: COUPONS },
  // Legal
  contractsTable: { mutation: 'deleteContract', roles: LEGAL },
  legalDocumentsTable: { mutation: 'deleteLegalDocument', roles: LEGAL },
  policiesTable: { mutation: 'deletePolicy', idArg: 'policy_doc_id', roles: LEGAL },
  // Website
  jobApplicationsTable: { mutation: 'deleteJobApplication', idArg: 'application_id', roles: WEBSITE },
  websiteNavTable: { mutation: 'deleteWebsiteNavItem', idArg: 'item_id', roles: WEBSITE },
  websiteContentTable: { mutation: 'deleteWebsiteContent', idArg: 'content_id', roles: WEBSITE },
  // Support
  faqsTable: {
    mutation: 'deleteFaq',
    idArg: 'faq_doc_id',
    roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'SUPPORT_MANAGER'],
  },
  // Marketing
  notificationsTable: { mutation: 'deleteNotification', idArg: 'notification_doc_id', roles: MARKETING },
  officialStatusesTable: { mutation: 'deleteOfficialStatus', idArg: 'status_doc_id', roles: MARKETING },
  appPopupsTable: { mutation: 'deleteAppPopup', roles: MARKETING },
  audienceListsTable: { mutation: 'deleteAudienceList', roles: MARKETING },
  shortLinksTable: { mutation: 'deleteShortLink', roles: MARKETING },
  adRequestsTable: { mutation: 'deleteAdRequest', roles: ADS },
  liveAdsTable: { mutation: 'deleteAdRequest', roles: ADS },
  // Challenges
  challengesTable: { mutation: 'deleteChallenge', roles: ['SUPER_ADMIN', 'CHALLENGE_MANAGER'] },
  // Onboarding
  surveysTable: { mutation: 'deleteSurvey', roles: ONBOARDING },
  hostRequestsTable: { mutation: 'deleteHostRequest', roles: ONBOARDING },
  // Products — the row delete archives the product.
  inventoryProductsTable: INVENTORY,
  marketplaceBrandProductsTable: INVENTORY,
  productListingRequestsTable: INVENTORY,
  // CRM
  crmCallPromptsTable: { mutation: 'deleteCrmCallPrompt', roles: CRM },
  crmServicesOfferedTable: { mutation: 'deleteCrmServiceOffered', roles: CRM },
  venueLeadsTable: { mutation: 'deleteVenueLead', roles: CRM },
  hostLeadsTable: { mutation: 'deleteHostLead', roles: CRM },
  ecommLeadsTable: { mutation: 'deleteEcommLead', roles: CRM },
};
