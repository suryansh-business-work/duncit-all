import type { typeDefsByModule } from '@modules/index';

/**
 * Where every GraphQL module's tools are filed.
 *
 * A category is a group of tools an AI client sees together; an endpoint (see
 * endpoints.ts) is a set of categories served at one connector URL. The map
 * below is keyed by the module's own typeDefs export, and typed against the
 * whole module list — so a module added to the API without a line here does
 * not compile, and no field ever reaches the catalog unfiled.
 *
 * `null` keeps a module out entirely: sign-in, OTPs, captchas, secrets and
 * credentials are things a person does, never an AI acting for them.
 */

export const MCP_CATEGORIES = [
  { key: 'users', label: 'Users & access', description: 'Accounts, roles, verification, account health, approvals and portal access.' },
  { key: 'account', label: 'My account', description: "The signed-in member's own profile, preferences, privacy, blocks, contacts, addresses and notifications." },
  { key: 'platform', label: 'Platform', description: 'Settings, locations, pop-ups, change logs, background jobs, uploads and console layout.' },
  { key: 'localization', label: 'Localization', description: 'Locales and every user-facing string.' },
  { key: 'pods', label: 'Pods', description: 'Pods end to end: create, edit, join, members, attendance, tickets, change requests, auto pods, drafts, ideas, history and search.' },
  { key: 'clubs', label: 'Clubs', description: 'Clubs, regions, club admins and their slot and event requests.' },
  { key: 'venues', label: 'Venues', description: 'Venues, slots, offers, rentals, food menus, partner requests and venue chats.' },
  { key: 'hosts', label: 'Hosts', description: 'Hosts and host applications.' },
  { key: 'finance', label: 'Finance', description: 'Payments, payouts, settlements, coupons, expenses, wallets and the pod calculator.' },
  { key: 'loyalty', label: 'Loyalty', description: 'Duncit Coin, virtual gift cards and printed (physical) gift cards.' },
  { key: 'employee', label: 'Employee', description: 'Employee expense claims.' },
  { key: 'partner-brand', label: 'Partner brands', description: 'Partner Brand products, inventory, reviews, pod-shop carts, orders and returns (partners-app.duncit.com/ecomm-brand).' },
  { key: 'ecomm-store', label: 'E-commerce store', description: 'The pet store at ecomm.duncit.com — its catalogue, orders and shipping. Separate from partner brands.' },
  { key: 'engagement', label: 'Engagement', description: 'Referrals, leaderboard, membership, badges and posts.' },
  { key: 'challenges', label: 'Challenges', description: 'Challenges, challenge tools and pod challenges.' },
  { key: 'gig-jobs', label: 'Gig jobs', description: 'Gigs, freelancers and their interests.' },
  { key: 'ai', label: 'AI', description: 'AI features, the prompt library, usage, monitoring, automations, reels and the Agent.' },
  { key: 'website', label: 'Website & CMS', description: 'Website content, navigation, reels, CMS pages, public pages and newsletter.' },
  { key: 'hr', label: 'HR', description: 'Job applications and the team structure (seats, salary, share links).' },
  { key: 'legal', label: 'Legal', description: 'Policies, acceptances, legal documents, contracts and grievances.' },
  { key: 'support', label: 'Support', description: 'FAQs, tickets and support chats.' },
  { key: 'moderation', label: 'Moderation', description: 'Content moderation and user reports.' },
  { key: 'crm', label: 'CRM', description: 'Leads, communication logs, call prompts, email verification, reminders, surveys and WhatsApp leads.' },
  { key: 'onboarding', label: 'Onboarding', description: 'Onboarding meetings, intros and lead surveys.' },
  { key: 'communications', label: 'Communications', description: 'Email templates and logs, mail automation, WhatsApp templates and campaigns, SMS and Slack.' },
  { key: 'marketing', label: 'Marketing', description: 'Marketing, short links and social publishing.' },
  { key: 'analytics', label: 'Analytics', description: 'Product and entity analytics, analytics mails, alerts and Google Analytics.' },
  { key: 'logs', label: 'Logs & monitoring', description: 'Telemetry, status reports and the GraphQL monitor.' },
  { key: 'tech', label: 'Tech & infrastructure', description: 'Server info, packages, backups, DNS, SSL, ports, Cloudflare, app builds and releases and rate limits.' },
  { key: 'tests', label: 'Testing & quality', description: 'The confidence dashboard, unit, E2E, stress and regression runs, E2E flows and the manual test board.' },
  { key: 'ads', label: 'Ads', description: 'Ad requests and campaigns.' },
  { key: 'chat', label: 'Chat', description: 'Pod chats and staff chat.' },
  { key: 'mcp', label: 'MCP', description: 'This MCP service: its tools, connections and usage.' },
  {
    key: 'lite',
    label: 'Duncit Lite',
    description: 'Duncit Lite events (lite.duncit.com): discover, create and manage events, guests, check-in, calendars and the Lite console — as your Lite account (same email).',
  },
] as const;

export type McpCategoryKey = (typeof MCP_CATEGORIES)[number]['key'];

/**
 * Categories whose tools come from another product's API rather than a module
 * of this one — they are filled at run time (see lite/lite.catalog.ts), so no
 * module is filed under them.
 */
export const REMOTE_CATEGORIES: ReadonlySet<McpCategoryKey> = new Set<McpCategoryKey>(['lite']);
export type ModuleName = keyof typeof typeDefsByModule;

export const MODULE_CATEGORY: Record<ModuleName, McpCategoryKey | null> = {
  rootTypeDefs: null,
  tableQueryTypeDefs: null,
  authTypeDefs: null,
  truecallerTypeDefs: null,
  captchaTypeDefs: null,
  otpTypeDefs: null,
  apiKeyTypeDefs: null,
  tableApiTypeDefs: null,
  envEntryTypeDefs: null,
  accountDeletionCronTypeDefs: null,

  userTypeDefs: 'users',
  userAuditTypeDefs: 'users',
  userRoleTypeDefs: 'users',
  rbacTypeDefs: 'users',
  verificationTypeDefs: 'users',
  accountHealthTypeDefs: 'users',
  portalAccessTypeDefs: 'users',
  accountDeletionTypeDefs: 'users',
  approvalTypeDefs: 'users',

  profileTypeDefs: 'account',
  commPreferenceTypeDefs: 'account',
  privacyTypeDefs: 'account',
  blockTypeDefs: 'account',
  contactChangeTypeDefs: 'account',
  addressBookTypeDefs: 'account',
  contactsTypeDefs: 'account',
  notificationTypeDefs: 'account',

  settingsTypeDefs: 'platform',
  locationTypeDefs: 'platform',
  locationSubscriptionTypeDefs: 'platform',
  appPopupTypeDefs: 'platform',
  officialStatusTypeDefs: 'platform',
  entityAuditTypeDefs: 'platform',
  tableChangeLogTypeDefs: 'platform',
  backgroundJobTypeDefs: 'platform',
  portalModeTypeDefs: 'platform',
  dashboardLayoutTypeDefs: 'platform',
  shellStateTypeDefs: 'platform',
  linkPreviewTypeDefs: 'platform',
  uploadTypeDefs: 'platform',
  uploadSettingTypeDefs: 'platform',

  localizationTypeDefs: 'localization',

  podTypeDefs: 'pods',
  podMemberTypeDefs: 'pods',
  podAuditTypeDefs: 'pods',
  podChangeRequestTypeDefs: 'pods',
  podHelpTypeDefs: 'pods',
  podPlanTypeDefs: 'pods',
  podDraftTypeDefs: 'pods',
  podSeriesTypeDefs: 'pods',
  autoPodTypeDefs: 'pods',
  podPendingViewTypeDefs: 'pods',
  podIdeaTypeDefs: 'pods',
  podAttendanceTypeDefs: 'pods',
  eventTicketTypeDefs: 'pods',
  bouncerTypeDefs: 'pods',
  feedbackTypeDefs: 'pods',
  categoryTypeDefs: 'pods',
  searchTypeDefs: 'pods',
  interviewTypeDefs: 'pods',

  clubTypeDefs: 'clubs',
  regionTypeDefs: 'clubs',
  clubAdminTypeDefs: 'clubs',
  clubAdminProfileTypeDefs: 'clubs',
  clubSlotRequestTypeDefs: 'clubs',
  eventRequestTypeDefs: 'clubs',

  venueTypeDefs: 'venues',
  venueFoodTypeDefs: 'venues',
  venueSlotTypeDefs: 'venues',
  venuePricingTypeDefs: 'venues',
  venueOfferTypeDefs: 'venues',
  podVenueOfferTypeDefs: 'venues',
  podPartnerRequestTypeDefs: 'venues',
  slotTemplateTypeDefs: 'venues',
  venueRentalTypeDefs: 'venues',
  venueChatTypeDefs: 'venues',

  hostTypeDefs: 'hosts',
  hostRequestTypeDefs: 'hosts',

  financeTypeDefs: 'finance',
  paymentTypeDefs: 'finance',
  couponTypeDefs: 'finance',
  expenseTypeDefs: 'finance',
  expenseOptionTypeDefs: 'finance',
  podExpenseTypeDefs: 'finance',
  podCalculatorTypeDefs: 'finance',
  walletTypeDefs: 'finance',
  founderTypeDefs: 'finance',

  coinTypeDefs: 'loyalty',
  giftCardTypeDefs: 'loyalty',
  physicalGiftCardTypeDefs: 'loyalty',

  employeeExpenseTypeDefs: 'employee',

  inventoryTypeDefs: 'partner-brand',
  productReviewTypeDefs: 'partner-brand',
  partnerDashboardTypeDefs: 'partner-brand',
  productOrderTypeDefs: 'partner-brand',
  productCartTypeDefs: 'partner-brand',
  podShopReturnTypeDefs: 'partner-brand',
  catalogDeletionTypeDefs: 'partner-brand',
  brandPickupLocationTypeDefs: 'partner-brand',
  ecommBrandTypeDefs: 'partner-brand',

  storeTypeDefs: 'ecomm-store',
  storeAdminTypeDefs: 'ecomm-store',
  storeShippingTypeDefs: 'ecomm-store',

  referralTypeDefs: 'engagement',
  leaderboardTypeDefs: 'engagement',
  membershipTypeDefs: 'engagement',
  badgeTypeDefs: 'engagement',
  postTypeDefs: 'engagement',

  challengeTypeDefs: 'challenges',
  challengeToolTypeDefs: 'challenges',
  podChallengeTypeDefs: 'challenges',
  podChallengeAdminTypeDefs: 'challenges',

  gigJobTypeDefs: 'gig-jobs',

  aiTypeDefs: 'ai',
  askBotTypeDefs: 'ai',
  agentTypeDefs: 'ai',
  aiPromptTypeDefs: 'ai',
  openAiUsageTypeDefs: 'ai',
  aiFeatureTypeDefs: 'ai',
  aiMonitoringTypeDefs: 'ai',
  automationTypeDefs: 'ai',
  reelTypeDefs: 'ai',

  websiteContentTypeDefs: 'website',
  somethingForYouTypeDefs: 'website',
  websiteNavTypeDefs: 'website',
  websiteReelTypeDefs: 'website',
  websiteEarnTypeDefs: 'website',
  cmsTypeDefs: 'website',
  publicPageTypeDefs: 'website',
  websitePageTypeDefs: 'website',
  newsletterTypeDefs: 'website',
  contactTypeDefs: 'website',

  jobApplicationTypeDefs: 'hr',
  teamStructureTypeDefs: 'hr',

  policyTypeDefs: 'legal',
  policyAcceptanceTypeDefs: 'legal',
  legalDocumentTypeDefs: 'legal',
  contractTypeDefs: 'legal',
  grievanceTypeDefs: 'legal',

  faqTypeDefs: 'support',
  ticketTypeDefs: 'support',
  supportChatTypeDefs: 'support',

  moderationTypeDefs: 'moderation',
  reportTypeDefs: 'moderation',

  crmTypeDefs: 'crm',
  commsProviderTypeDefs: 'crm',
  communicationLogTypeDefs: 'crm',
  callPromptTypeDefs: 'crm',
  emailVerificationTypeDefs: 'crm',
  serviceOfferedTypeDefs: 'crm',
  managedOptionTypeDefs: 'crm',
  crmEmailTemplateTypeDefs: 'crm',
  reminderTypeDefs: 'crm',
  waLeadsTypeDefs: 'crm',
  surveyTypeDefs: 'crm',

  meetingTypeDefs: 'onboarding',
  onboardingIntroTypeDefs: 'onboarding',
  leadSurveyTypeDefs: 'onboarding',

  emailFragmentTypeDefs: 'communications',
  emailLogTypeDefs: 'communications',
  mailPreferenceTypeDefs: 'communications',
  emailTemplateTypeDefs: 'communications',
  mailAutomationTypeDefs: 'communications',
  aisensyTypeDefs: 'communications',
  waAutomationTypeDefs: 'communications',
  whatsappTypeDefs: 'communications',
  waCampaignTypeDefs: 'communications',
  msg91TypeDefs: 'communications',
  slackTypeDefs: 'communications',

  marketingTypeDefs: 'marketing',
  shortLinkTypeDefs: 'marketing',
  socialTypeDefs: 'marketing',
  socialPublishTypeDefs: 'marketing',

  analyticsTypeDefs: 'analytics',
  entityAnalyticsTypeDefs: 'analytics',
  analyticsMailTypeDefs: 'analytics',
  analyticsAlertTypeDefs: 'analytics',
  googleAnalyticsTypeDefs: 'analytics',

  telemetryTypeDefs: 'logs',
  statusReportTypeDefs: 'logs',
  graphqlMonitorTypeDefs: 'logs',

  techTypeDefs: 'tech',
  packageUpdatesTypeDefs: 'tech',
  dataCloneTypeDefs: 'tech',
  dbBackupTypeDefs: 'tech',
  dnsTypeDefs: 'tech',
  sslTypeDefs: 'tech',
  portMapTypeDefs: 'tech',
  cloudflareTypeDefs: 'tech',
  appReleaseTypeDefs: 'tech',
  appBuildTypeDefs: 'tech',
  storeListingTypeDefs: 'tech',
  storeReleaseTypeDefs: 'tech',
  e2eRunTypeDefs: 'tests',
  e2eFlowTypeDefs: 'tests',
  stressTestTypeDefs: 'tests',
  testsOverviewTypeDefs: 'tests',
  manualTestTypeDefs: 'tests',
  unitTestRunTypeDefs: 'tests',
  regressionReportTypeDefs: 'tests',
  rateLimitTypeDefs: 'tech',

  adsTypeDefs: 'ads',

  chatTypeDefs: 'chat',
  staffChatTypeDefs: 'chat',

  mcpTypeDefs: 'mcp',
};

const LABELS: ReadonlyMap<string, string> = new Map(MCP_CATEGORIES.map((c) => [c.key, c.label]));

export const categoryLabel = (key: string): string => LABELS.get(key) ?? key;
