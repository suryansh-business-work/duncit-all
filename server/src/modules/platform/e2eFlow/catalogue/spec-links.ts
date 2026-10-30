/**
 * Which live Cypress spec files exercise each catalogue flow, as
 * `<project>/<spec path>` — the same `spec_key` every E2E scenario row carries
 * (project is the Cypress project folder: mweb, partners-app, support,
 * mobile-app). The Flows table counts a flow's runs, passes and failures from
 * the scenarios of these specs.
 *
 * Written 2026-10-31 by matching each spec's describe title and file name to
 * the flow names of its area, then read spec by spec and corrected by hand. A
 * flow missing here has no automated test yet. Add a spec to its flow when you
 * write one; a flow name changed in the catalogue must be changed here too.
 */
export const E2E_FLOW_SPEC_LINKS: Readonly<Record<string, readonly string[]>> = {
  'Admin: Approvals': [
    'support/__tests__/e2e/specs/admin/approvals.cy.ts',
  ],
  'Admin: Badges': [
    'mweb/__tests__/e2e/specs/api/staff/badges.cy.ts',
    'support/__tests__/e2e/specs/admin/badges.cy.ts',
  ],
  'Admin: Branding': [
    'mweb/__tests__/e2e/specs/api/staff/branding.cy.ts',
    'support/__tests__/e2e/specs/admin/branding.cy.ts',
  ],
  'Admin: Categories': [
    'mweb/__tests__/e2e/specs/api/staff/categories.cy.ts',
    'support/__tests__/e2e/specs/admin/categories-1.cy.ts',
    'support/__tests__/e2e/specs/admin/categories-2.cy.ts',
  ],
  'Admin: City Launch Settings': [
    'support/__tests__/e2e/specs/admin/city-launch-settings.cy.ts',
  ],
  'Admin: Console Access & Setup': [
    'mweb/__tests__/e2e/specs/api/staff/admin-console-access.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/city-scope.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/console-access-and-setup.cy.ts',
    'support/__tests__/e2e/specs/admin/city-scope.cy.ts',
    'support/__tests__/e2e/specs/admin/console-access-2.cy.ts',
    'support/__tests__/e2e/specs/admin/console-access-setup.cy.ts',
  ],
  'Admin: Dashboard': [
    'mweb/__tests__/e2e/specs/api/staff/dashboard.cy.ts',
    'support/__tests__/e2e/specs/admin/dashboard.cy.ts',
  ],
  'Admin: Hub & Navigation': [
    'support/__tests__/e2e/specs/admin/hub-navigation.cy.ts',
  ],
  'Admin: Locations': [
    'support/__tests__/e2e/specs/admin/locations.cy.ts',
  ],
  'Admin: Membership': [
    'mweb/__tests__/e2e/specs/api/staff/membership.cy.ts',
    'support/__tests__/e2e/specs/admin/membership.cy.ts',
  ],
  'Admin: Partners': [
    'support/__tests__/e2e/specs/admin/partners.cy.ts',
  ],
  'Admin: Portal Access Requests': [
    'support/__tests__/e2e/specs/admin/portal-access-requests.cy.ts',
    'support/__tests__/e2e/specs/shell/portal-access-requests.cy.ts',
  ],
  'Admin: Portal App Settings': [
    'mweb/__tests__/e2e/specs/api/staff/portal-app-settings.cy.ts',
    'support/__tests__/e2e/specs/admin/portal-app-settings.cy.ts',
  ],
  'Admin: Roles & Super Admins': [
    'mweb/__tests__/e2e/specs/api/staff/roles-and-super-admins.cy.ts',
    'support/__tests__/e2e/specs/admin/roles-super-admins.cy.ts',
  ],
  'Admin: Settings': [
    'support/__tests__/e2e/specs/admin/settings.cy.ts',
  ],
  'Admin: Something For You': [
    'support/__tests__/e2e/specs/admin/something-for-you.cy.ts',
  ],
  'Admin: Subscribe for location': [
    'support/__tests__/e2e/specs/admin/subscribe-for-location.cy.ts',
  ],
  'Admin: Upload Settings': [
    'support/__tests__/e2e/specs/admin/upload-settings.cy.ts',
  ],
  'Admin: User Account Health': [
    'support/__tests__/e2e/specs/admin/user-account-health.cy.ts',
  ],
  'Admin: User App Activity': [
    'mweb/__tests__/e2e/specs/api/staff/user-app-activity.cy.ts',
    'support/__tests__/e2e/specs/admin/user-app-activity.cy.ts',
  ],
  'Admin: User Call & Email Logs': [
    'support/__tests__/e2e/specs/admin/user-call-email-logs.cy.ts',
  ],
  'Admin: User Change Logs': [
    'support/__tests__/e2e/specs/admin/user-change-logs.cy.ts',
  ],
  'Admin: User Interests, Badges & Surveys': [
    'support/__tests__/e2e/specs/admin/user-interests-badges-surveys.cy.ts',
  ],
  'Admin: User Profile & Account Status': [
    'support/__tests__/e2e/specs/admin/user-profile-account-status.cy.ts',
  ],
  'Admin: User Verification Review': [
    'support/__tests__/e2e/specs/admin/user-verification-review.cy.ts',
  ],
  'Admin: Users': [
    'mweb/__tests__/e2e/specs/api/staff/user-roles-and-host-categories.cy.ts',
    'support/__tests__/e2e/specs/admin/user-details.cy.ts',
    'support/__tests__/e2e/specs/admin/users-dashboard.cy.ts',
    'support/__tests__/e2e/specs/admin/users.cy.ts',
  ],
  'Ads Website: Footer and newsletter': [
    'mweb/__tests__/e2e/specs/ui/websites/ads/newsletter.cy.ts',
  ],
  'Ads Website: Landing page': [
    'mweb/__tests__/e2e/specs/ui/websites/ads/landing.cy.ts',
  ],
  'Ads Website: Placements and campaign calculator': [
    'mweb/__tests__/e2e/specs/ui/websites/ads/rate-card-calculator.cy.ts',
  ],
  'Analytics: Alerts': [
    'mweb/__tests__/e2e/specs/api/staff/alerts.cy.ts',
  ],
  'Analytics: Analytics Mails': [
    'mweb/__tests__/e2e/specs/api/staff/analytics-mails.cy.ts',
  ],
  'App: Account Deletion': [
    'mobile-app/__tests__/e2e/specs/08-delete.cy.ts',
    'mweb/__tests__/e2e/specs/08-delete.cy.ts',
    'partners-app/__tests__/e2e/specs/03-after-delete.cy.ts',
  ],
  'App: Address Book': [
    'mweb/__tests__/e2e/specs/ui/account/address-book.cy.ts',
  ],
  'App: Badges': [
    'mweb/__tests__/e2e/specs/ui/account/badges.cy.ts',
  ],
  'App: Bouncers Legacy Link': [
    'mweb/__tests__/e2e/specs/ui/access/legacy-links.cy.ts',
  ],
  'App: Cart': [
    'mweb/__tests__/e2e/specs/ui/commerce/cart.cy.ts',
  ],
  'App: City Launch Waitlist': [
    'mweb/__tests__/e2e/specs/ui/discovery/city-launch.cy.ts',
  ],
  'App: Club Admin In-App': [
    'mweb/__tests__/e2e/specs/api/apps/club-admin-studio.cy.ts',
    'mweb/__tests__/e2e/specs/api/fixtures/club-admin.cy.ts',
  ],
  'App: Clubs and Venues Directory': [
    'mweb/__tests__/e2e/specs/ui/discovery/discovery.cy.ts',
  ],
  'App: Communication Preferences': [
    'mweb/__tests__/e2e/specs/ui/account/communication-preferences.cy.ts',
  ],
  'App: Duncit Coins wallet': [
    'mweb/__tests__/e2e/specs/api/apps/duncit-coins.cy.ts',
  ],
  'App: Earn with Duncit': [
    'mweb/__tests__/e2e/specs/ui/earn/partner-onboarding.cy.ts',
  ],
  'App: Explore reels': [
    'mweb/__tests__/e2e/specs/ui/discovery/explore-reels.cy.ts',
  ],
  'App: Follow & public profiles': [
    'mweb/__tests__/e2e/specs/ui/social/social-follow.cy.ts',
  ],
  'App: Following feed': [
    'mweb/__tests__/e2e/specs/ui/social/following-feed.cy.ts',
  ],
  'App: Gift cards': [
    'mweb/__tests__/e2e/specs/ui/commerce/gift-cards-2.cy.ts',
    'mweb/__tests__/e2e/specs/ui/commerce/gift-cards-3.cy.ts',
  ],
  'App: Host - Attendance Board & Scanning': [
    'mweb/__tests__/e2e/specs/api/apps/host-attendance.cy.ts',
  ],
  'App: Host - Cancel Pod': [
    'mweb/__tests__/e2e/specs/api/apps/host-cancel-pod.cy.ts',
  ],
  'App: Host - Complete Pod & Earnings': [
    'mweb/__tests__/e2e/specs/10-pod-payout.cy.ts',
    'mweb/__tests__/e2e/specs/api/apps/host-complete-earnings.cy.ts',
  ],
  'App: Host - Create Pod Stepper': [
    'mweb/__tests__/e2e/specs/api/apps/host-create-pod.cy.ts',
    'mweb/__tests__/e2e/specs/ui/studios/host-create-pod-1.cy.ts',
  ],
  'App: Host - Your Pods & Pod Actions': [
    'mweb/__tests__/e2e/specs/api/apps/host-manage-pods.cy.ts',
  ],
  'App: Language and Theme': [
    'mweb/__tests__/e2e/specs/ui/account/localization-theme.cy.ts',
  ],
  'App: Leaderboard': [
    'mweb/__tests__/e2e/specs/ui/account/leaderboard.cy.ts',
  ],
  'App: Live Pod Challenges': [
    'mweb/__tests__/e2e/specs/api/apps/live-pod-challenges.cy.ts',
  ],
  'App: Membership (coming soon)': [
    'mweb/__tests__/e2e/specs/ui/account/membership.cy.ts',
  ],
  'App: Notifications inbox': [
    'mweb/__tests__/e2e/specs/ui/account/notifications.cy.ts',
  ],
  'App: Orders & shipment tracking': [
    'mweb/__tests__/e2e/specs/ui/commerce/product-orders.cy.ts',
  ],
  'App: Partner Wallet & Withdrawals': [
    'mweb/__tests__/e2e/specs/api/apps/wallet.cy.ts',
  ],
  'App: Password and Connected Accounts': [
    'mobile-app/__tests__/e2e/specs/05-change-password.cy.ts',
    'mweb/__tests__/e2e/specs/05-change-password.cy.ts',
  ],
  'App: Password Recovery': [
    'mobile-app/__tests__/e2e/specs/03-forgot-password.cy.ts',
    'mweb/__tests__/e2e/specs/03-forgot-password.cy.ts',
  ],
  'App: Pod Booking & Checkout': [
    'mweb/__tests__/e2e/specs/api/apps/free-physical-pods.cy.ts',
    'mweb/__tests__/e2e/specs/ui/pods/free-physical-pods.cy.ts',
    'mweb/__tests__/e2e/specs/ui/pods/pod-booking-payment.cy.ts',
  ],
  'App: Pod chats': [
    'mweb/__tests__/e2e/specs/ui/social/pod-chats.cy.ts',
  ],
  'App: Pod Details Page': [
    'mweb/__tests__/e2e/specs/ui/pods/pod-details.cy.ts',
  ],
  'App: Pod Discovery - Home Feed': [
    'mweb/__tests__/e2e/specs/ui/discovery/pod-discovery.cy.ts',
  ],
  'App: Pod Discovery - Location': [
    'mweb/__tests__/e2e/specs/ui/discovery/location-1.cy.ts',
    'mweb/__tests__/e2e/specs/ui/discovery/location-3.cy.ts',
  ],
  'App: Pod History & Tickets': [
    'mweb/__tests__/e2e/specs/api/apps/bookings.cy.ts',
    'mweb/__tests__/e2e/specs/ui/pods/bookings-tickets.cy.ts',
  ],
  'App: Pod Ideas': [
    'mobile-app/__tests__/e2e/specs/07-pod-ideas.cy.ts',
    'mweb/__tests__/e2e/specs/07-pod-ideas.cy.ts',
    'mweb/__tests__/e2e/specs/ui/pods/pod-ideas-1.cy.ts',
  ],
  'App: Pod Media Uploads': [
    'mweb/__tests__/e2e/specs/ui/pods/pod-media.cy.ts',
  ],
  'App: Pod Partner Requests': [
    'mweb/__tests__/e2e/specs/api/apps/pod-partner-requests.cy.ts',
    'mweb/__tests__/e2e/specs/api/fixtures/pod-partner-requests.cy.ts',
  ],
  'App: Pod Plans': [
    'mweb/__tests__/e2e/specs/ui/account/pod-plans.cy.ts',
  ],
  'App: Pod Ratings & Feedback': [
    'mweb/__tests__/e2e/specs/ui/pods/pod-ratings.cy.ts',
  ],
  'App: Pod Search & Explore': [
    'mweb/__tests__/e2e/specs/ui/discovery/search-explore.cy.ts',
  ],
  'App: Pod Shop browsing': [
    'mweb/__tests__/e2e/specs/ui/commerce/pod-shop.cy.ts',
  ],
  'App: Policies and Legal': [
    'mweb/__tests__/e2e/specs/ui/account/legal-policies.cy.ts',
  ],
  'App: Posts': [
    'mweb/__tests__/e2e/specs/ui/social/social-posts.cy.ts',
  ],
  'App: Privacy and Tracking Consent': [
    'mweb/__tests__/e2e/specs/api/apps/privacy-gdpr.cy.ts',
    'mweb/__tests__/e2e/specs/ui/account/privacy-gdpr.cy.ts',
  ],
  'App: Product details & reviews': [
    'mweb/__tests__/e2e/specs/ui/commerce/product-details.cy.ts',
  ],
  'App: Product Studio': [
    'mweb/__tests__/e2e/specs/ui/studios/product-studio.cy.ts',
  ],
  'App: Profile': [
    'mobile-app/__tests__/e2e/specs/04-profile.cy.ts',
    'mweb/__tests__/e2e/specs/04-profile.cy.ts',
    'mweb/__tests__/e2e/specs/api/apps/member-own-data.cy.ts',
    'mweb/__tests__/e2e/specs/ui/account/profile.cy.ts',
  ],
  'App: Public Host Page': [
    'mweb/__tests__/e2e/specs/ui/discovery/public-host-page.cy.ts',
  ],
  'App: Public Venue Page': [
    'mweb/__tests__/e2e/specs/ui/discovery/public-venue-page.cy.ts',
  ],
  'App: Publish Public Pages': [
    'mweb/__tests__/e2e/specs/api/apps/host-public-page-publish.cy.ts',
    'mweb/__tests__/e2e/specs/api/apps/venue-public-page-publish.cy.ts',
    'mweb/__tests__/e2e/specs/api/fixtures/venue-publish.cy.ts',
  ],
  'App: Refer & Earn': [
    'mweb/__tests__/e2e/specs/api/apps/referrals.cy.ts',
  ],
  'App: Report Content': [
    'mweb/__tests__/e2e/specs/api/apps/social-safety.cy.ts',
  ],
  'App: Route Guards': [
    'mweb/__tests__/e2e/specs/ui/access/route-guards.cy.ts',
  ],
  'App: Saved Items': [
    'mweb/__tests__/e2e/specs/ui/discovery/saved-items.cy.ts',
  ],
  'App: Sessions and Sign Out': [
    'mweb/__tests__/e2e/specs/api/other/auth-sessions.cy.ts',
    'mweb/__tests__/e2e/specs/ui/account/auth-sessions.cy.ts',
  ],
  'App: Share links & deep links': [
    'mweb/__tests__/e2e/specs/ui/discovery/share-deep-links.cy.ts',
  ],
  'App: Sign In': [
    'mobile-app/__tests__/e2e/specs/02-signin.cy.ts',
    'mobile-app/__tests__/e2e/specs/09-google.cy.ts',
    'mweb/__tests__/e2e/specs/02-signin.cy.ts',
    'mweb/__tests__/e2e/specs/09-google.cy.ts',
    'mweb/__tests__/e2e/specs/api/apps/auth-sign-in.cy.ts',
    'mweb/__tests__/e2e/specs/api/other/apple-sign-in-relay.cy.ts',
  ],
  'App: Sign Up': [
    'mobile-app/__tests__/e2e/specs/01-signup.cy.ts',
    'mobile-app/__tests__/e2e/specs/09-google.cy.ts',
    'mweb/__tests__/e2e/specs/01-signup.cy.ts',
    'mweb/__tests__/e2e/specs/09-google.cy.ts',
  ],
  'App: Stories': [
    'mweb/__tests__/e2e/specs/ui/social/social-stories.cy.ts',
  ],
  'App: Studio Options & Role Switch': [
    'mweb/__tests__/e2e/specs/ui/studios/studio-options.cy.ts',
  ],
  'App: Support Tickets': [
    'mobile-app/__tests__/e2e/specs/06-support.cy.ts',
    'mweb/__tests__/e2e/specs/06-support.cy.ts',
    'mweb/__tests__/e2e/specs/api/apps/support-ticket-isolation.cy.ts',
    'mweb/__tests__/e2e/specs/ui/support/support-tickets.cy.ts',
  ],
  'App: Tour Guide': [
    'mweb/__tests__/e2e/specs/ui/account/tour-guide.cy.ts',
  ],
  'App: Venue Earnings': [
    'mweb/__tests__/e2e/specs/api/apps/venue-earnings.cy.ts',
  ],
  'App: Venue Food Desk': [
    'mweb/__tests__/e2e/specs/api/apps/venue-food-desk.cy.ts',
  ],
  'App: Venue Food Ordering': [
    'mweb/__tests__/e2e/specs/api/apps/venue-food-ordering.cy.ts',
    'mweb/__tests__/e2e/specs/ui/venues/venue-food-ordering.cy.ts',
  ],
  'App: Venue Slot Requests': [
    'mweb/__tests__/e2e/specs/11-venue-offer.cy.ts',
    'mweb/__tests__/e2e/specs/api/apps/venue-slot-requests.cy.ts',
  ],
  'App: Venue Studio': [
    'mweb/__tests__/e2e/specs/api/apps/venue-studio.cy.ts',
  ],
  'App: Verification': [
    'mweb/__tests__/e2e/specs/ui/account/verification.cy.ts',
  ],
  'Club Admins: Access & Dashboard': [
    'mweb/__tests__/e2e/specs/api/partners/club-admins-console-access.cy.ts',
  ],
  'Club Admins: Club Admin Editor': [
    'support/__tests__/e2e/specs/club-admins/club-admin-editor.cy.ts',
  ],
  'Club Admins: List & Record': [
    'mweb/__tests__/e2e/specs/api/partners/club-admin-directory.cy.ts',
    'support/__tests__/e2e/specs/club-admins/club-admin-directory.cy.ts',
  ],
  'Clubs: Club Editor': [
    'support/__tests__/e2e/specs/clubs/club-editor.cy.ts',
  ],
  'Clubs: Club List': [
    'support/__tests__/e2e/specs/clubs/club-directory.cy.ts',
  ],
  'Clubs: Requests for Club Admins': [
    'support/__tests__/e2e/specs/clubs/club-slot-requests.cy.ts',
  ],
  'Communications: Access': [
    'mweb/__tests__/e2e/specs/api/staff/communications-console-access.cy.ts',
    'support/__tests__/e2e/specs/communications/console-access.cy.ts',
  ],
  'Communications: WhatsApp automation': [
    'mweb/__tests__/e2e/specs/api/staff/ownership-move.cy.ts',
    'support/__tests__/e2e/specs/communications/whatsapp-automation.cy.ts',
    'support/__tests__/e2e/specs/communications/whatsapp-campaigns.cy.ts',
  ],
  'CRM: Access and dashboard': [
    'mweb/__tests__/e2e/specs/api/staff/access-and-dashboard.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/crm-console-access.cy.ts',
    'support/__tests__/e2e/specs/crm/console-access.cy.ts',
  ],
  'CRM: AI Call Prompts': [
    'support/__tests__/e2e/specs/crm/ai-call-prompts.cy.ts',
  ],
  'CRM: Data catalogues': [
    'support/__tests__/e2e/specs/crm/data-catalogues.cy.ts',
  ],
  'CRM: Ecomm Leads': [
    'support/__tests__/e2e/specs/crm/ecomm-leads.cy.ts',
  ],
  'CRM: Email Templates': [
    'support/__tests__/e2e/specs/crm/email-templates.cy.ts',
  ],
  'CRM: Host Leads': [
    'support/__tests__/e2e/specs/crm/host-leads.cy.ts',
  ],
  'CRM: Venue Leads': [
    'support/__tests__/e2e/specs/crm/venue-leads.cy.ts',
  ],
  'CRM: WhatsApp Leads': [
    'support/__tests__/e2e/specs/crm/whatsapp-leads.cy.ts',
  ],
  'Earn With Website: Earnings calculator': [
    'mweb/__tests__/e2e/specs/ui/websites/earnwith/earnings-calculator.cy.ts',
  ],
  'Earn With Website: Footer and newsletter': [
    'mweb/__tests__/e2e/specs/ui/websites/earnwith/newsletter.cy.ts',
  ],
  'Earn With Website: Landing page and earn paths': [
    'mweb/__tests__/e2e/specs/ui/websites/earnwith/landing.cy.ts',
  ],
  'Ecomm Portal: Access': [
    'mweb/__tests__/e2e/specs/api/partners/store-admin-access.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/ecomm-store-console-access.cy.ts',
    'support/__tests__/e2e/specs/ecomm-portal/store-access.cy.ts',
  ],
  'Ecomm Store: Browsing & Search': [
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-browsing.cy.ts',
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-product.cy.ts',
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-search.cy.ts',
  ],
  'Ecomm Store: Cart & Checkout': [
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-cart.cy.ts',
  ],
  'Ecomm Store: Content & Settings': [
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-content.cy.ts',
  ],
  'Ecomm Store: Engagement & Support': [
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-support.cy.ts',
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-wishlist.cy.ts',
  ],
  'Ecomm Store: Orders & Returns': [
    'mweb/__tests__/e2e/specs/ui/websites/ecomm/store-track.cy.ts',
  ],
  'Finance: Access and dashboards': [
    'mweb/__tests__/e2e/specs/api/staff/access-and-dashboards.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/authorization.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/finance-console-access.cy.ts',
    'support/__tests__/e2e/specs/finance/access-and-dashboards.cy.ts',
    'support/__tests__/e2e/specs/finance/console-access.cy.ts',
  ],
  'Finance: Backout Refunds': [
    'support/__tests__/e2e/specs/finance/backout-refunds.cy.ts',
  ],
  'Finance: Cancellations': [
    'support/__tests__/e2e/specs/finance/cancellations.cy.ts',
  ],
  'Finance: Default Deductions': [
    'support/__tests__/e2e/specs/finance/default-deductions.cy.ts',
  ],
  'Finance: Duncit Expenses': [
    'support/__tests__/e2e/specs/finance/duncit-expenses.cy.ts',
  ],
  'Finance: Employee Expenses': [
    'support/__tests__/e2e/specs/finance/employee-expenses.cy.ts',
  ],
  'Finance: Expense Dashboard': [
    'support/__tests__/e2e/specs/finance/expense-dashboard.cy.ts',
  ],
  'Finance: Expense Settings': [
    'support/__tests__/e2e/specs/finance/expense-settings.cy.ts',
  ],
  'Finance: Food Menu Defaults': [
    'mweb/__tests__/e2e/specs/api/staff/food-menu-defaults-gst.cy.ts',
    'support/__tests__/e2e/specs/finance/food-menu-defaults.cy.ts',
  ],
  'Finance: Invoices': [
    'support/__tests__/e2e/specs/finance/invoices.cy.ts',
  ],
  'Finance: Payment Logs': [
    'support/__tests__/e2e/specs/finance/ecomm-store-money.cy.ts',
    'support/__tests__/e2e/specs/finance/payment-logs.cy.ts',
    'support/__tests__/e2e/specs/finance/round-offs.cy.ts',
    'support/__tests__/e2e/specs/finance/user-refund-logs.cy.ts',
  ],
  'Finance: Payment Release': [
    'mweb/__tests__/e2e/specs/10-pod-payout.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/payment-release.cy.ts',
    'support/__tests__/e2e/specs/finance/payment-release.cy.ts',
  ],
  'Finance: Payout Cycles': [
    'support/__tests__/e2e/specs/finance/payout-cycles.cy.ts',
  ],
  'Finance: Pod Expenses': [
    'support/__tests__/e2e/specs/finance/pod-expenses.cy.ts',
  ],
  'Finance: Pod Finance': [
    'support/__tests__/e2e/specs/finance/pod-finance.cy.ts',
    'support/__tests__/e2e/specs/finance/pod-shop-money.cy.ts',
  ],
  'Finance: Pod Profit Calculator': [
    'support/__tests__/e2e/specs/finance/pod-profit-calculator.cy.ts',
  ],
  'Finance: Referrals': [
    'support/__tests__/e2e/specs/finance/referrals.cy.ts',
  ],
  'Finance: Withdrawals': [
    'mweb/__tests__/e2e/specs/api/staff/withdrawals.cy.ts',
    'support/__tests__/e2e/specs/finance/withdrawals.cy.ts',
  ],
  'Hosts: Access & Dashboard': [
    'mweb/__tests__/e2e/specs/api/partners/hosts-console-access.cy.ts',
  ],
  'Hosts: Host Editor': [
    'support/__tests__/e2e/specs/hosts/host-editor.cy.ts',
  ],
  'Hosts: Host List & Record': [
    'support/__tests__/e2e/specs/hosts/host-directory.cy.ts',
  ],
  'Legal: Access and dashboard': [
    'mweb/__tests__/e2e/specs/api/staff/access-and-dashboard.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/legal-console-access.cy.ts',
    'support/__tests__/e2e/specs/legal/access-and-dashboard.cy.ts',
    'support/__tests__/e2e/specs/legal/console-access.cy.ts',
  ],
  'Legal: Contracts': [
    'support/__tests__/e2e/specs/legal/contracts.cy.ts',
  ],
  'Legal: Documents': [
    'support/__tests__/e2e/specs/legal/brand-consent.cy.ts',
    'support/__tests__/e2e/specs/legal/documents.cy.ts',
  ],
  'Legal: Grievance': [
    'support/__tests__/e2e/specs/02-legal-portal.cy.ts',
    'support/__tests__/e2e/specs/legal/grievance.cy.ts',
  ],
  'Legal: Policies': [
    'support/__tests__/e2e/specs/legal/policies.cy.ts',
  ],
  'Legal: Policy Acceptance Logs': [
    'support/__tests__/e2e/specs/legal/policy-acceptance-logs.cy.ts',
  ],
  'Legal: UGC Monitoring': [
    'support/__tests__/e2e/specs/legal/ugc-monitoring.cy.ts',
  ],
  'Logs: Access': [
    'mweb/__tests__/e2e/specs/api/staff/logs-console-access.cy.ts',
    'support/__tests__/e2e/specs/logs/console-access.cy.ts',
  ],
  'Logs: Logs console': [
    'mweb/__tests__/e2e/specs/api/staff/delete-all.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/logs-console.cy.ts',
    'support/__tests__/e2e/specs/logs/logs-console.cy.ts',
  ],
  'Loyalty: Duncit Coin': [
    'support/__tests__/e2e/specs/finance/duncit-coin.cy.ts',
  ],
  'Loyalty: Virtual Gift Cards': [
    'support/__tests__/e2e/specs/finance/gift-cards.cy.ts',
  ],
  'Marketing: Access and dashboard': [
    'mweb/__tests__/e2e/specs/api/staff/access-and-dashboard.cy.ts',
  ],
  'Marketing: Ads': [
    'mweb/__tests__/e2e/specs/api/staff/ads.cy.ts',
  ],
  'Marketing: Coupons': [
    'mweb/__tests__/e2e/specs/api/staff/coupons.cy.ts',
  ],
  'Marketing: Email campaigns': [
    'mweb/__tests__/e2e/specs/api/staff/ownership-move.cy.ts',
  ],
  'Marketing: Short Links': [
    'mweb/__tests__/e2e/specs/api/staff/short-links.cy.ts',
  ],
  'Onboarding: Dashboard': [
    'support/__tests__/e2e/specs/onboarding/onboarding-dashboard.cy.ts',
  ],
  'Onboarding: Host Additional Requests': [
    'support/__tests__/e2e/specs/onboarding/host-requests.cy.ts',
  ],
  'Onboarding: Meeting Calendar': [
    'support/__tests__/e2e/specs/onboarding/onboarding-meetings.cy.ts',
  ],
  'Onboarding: Meeting Decisions': [
    'support/__tests__/e2e/specs/onboarding/applicant-approval.cy.ts',
  ],
  'Onboarding: Onboarded Club Admins': [
    'support/__tests__/e2e/specs/onboarding/club-admin-review.cy.ts',
  ],
  'Onboarding: Onboarded E-Commerce Brands': [
    'support/__tests__/e2e/specs/onboarding/brand-review.cy.ts',
  ],
  'Onboarding: Onboarded Hosts Review': [
    'mweb/__tests__/e2e/specs/api/partners/applicant-approval.cy.ts',
    'support/__tests__/e2e/specs/onboarding/host-review.cy.ts',
  ],
  'Onboarding: Onboarded Venues': [
    'support/__tests__/e2e/specs/onboarding/venue-review.cy.ts',
  ],
  'Onboarding: Portal Navigation & Product Flag': [
    'mweb/__tests__/e2e/specs/api/partners/onboarding-console-pages.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/onboarding-console-access.cy.ts',
    'support/__tests__/e2e/specs/onboarding/access-and-navigation.cy.ts',
  ],
  'Onboarding: Settings': [
    'support/__tests__/e2e/specs/onboarding/onboarding-settings.cy.ts',
  ],
  'Onboarding: Survey Builder': [
    'mweb/__tests__/e2e/specs/api/partners/onboarding-surveys.cy.ts',
    'support/__tests__/e2e/specs/onboarding/onboarding-surveys.cy.ts',
  ],
  'Partners Website: Footer and newsletter': [
    'mweb/__tests__/e2e/specs/ui/websites/partners/newsletter.cy.ts',
  ],
  'Partners Website: Landing page': [
    'mweb/__tests__/e2e/specs/ui/websites/partners/landing.cy.ts',
  ],
  'Partners: Brand Orders & Returns': [
    'mweb/__tests__/e2e/specs/api/partners/store-shopper-isolation.cy.ts',
  ],
  'Partners: Brand Settings & Warehouses': [
    'partners-app/__tests__/e2e/specs/ui/brand-warehouses.cy.ts',
  ],
  'Partners: Change Requests': [
    'mweb/__tests__/e2e/specs/api/partners/change-requests.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/change-requests.cy.ts',
  ],
  'Partners: Club Admin Club Pods': [
    'partners-app/__tests__/e2e/specs/ui/club-pods.cy.ts',
  ],
  'Partners: Club Admin Clubs': [
    'mweb/__tests__/e2e/specs/api/partners/club-admin-studio-access.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/club-admin-clubs.cy.ts',
  ],
  'Partners: Club Admin Dashboard': [
    'partners-app/__tests__/e2e/specs/ui/club-admin-dashboard.cy.ts',
  ],
  'Partners: Club Admin Mark Attendance': [
    'partners-app/__tests__/e2e/specs/ui/attendance.cy.ts',
  ],
  'Partners: Club Admin Pod Monitoring': [
    'partners-app/__tests__/e2e/specs/ui/pod-monitoring.cy.ts',
  ],
  'Partners: E-Commerce Access': [
    'partners-app/__tests__/e2e/specs/ui/e-commerce-access.cy.ts',
  ],
  'Partners: E-Commerce Dashboard': [
    'partners-app/__tests__/e2e/specs/ui/brand-dashboard.cy.ts',
  ],
  'Partners: Earn with Duncit': [
    'mweb/__tests__/e2e/specs/api/partners/earn-onboarding-journeys.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/earn-journeys.cy.ts',
  ],
  'Partners: FAQs': [
    'partners-app/__tests__/e2e/specs/ui/faqs.cy.ts',
  ],
  'Partners: Host Access': [
    'mweb/__tests__/e2e/specs/api/partners/host-studio-access.cy.ts',
  ],
  'Partners: Host Application': [
    'partners-app/__tests__/e2e/specs/ui/host-onboarding.cy.ts',
  ],
  'Partners: Host Auto Pods': [
    'partners-app/__tests__/e2e/specs/ui/auto-pods-2.cy.ts',
  ],
  'Partners: Host Dashboard': [
    'partners-app/__tests__/e2e/specs/ui/host-dashboard-1.cy.ts',
  ],
  'Partners: Host Pods': [
    'mweb/__tests__/e2e/specs/api/fixtures/host-pods.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/host-pods-1.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/host-pods-2.cy.ts',
  ],
  'Partners: Landing & Sidebar': [
    'mweb/__tests__/e2e/specs/api/partners/partner-gates.cy.ts',
    'partners-app/__tests__/e2e/specs/01-signin.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/access-navigation-1.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/access-navigation-2.cy.ts',
  ],
  'Partners: Pod Partner Requests': [
    'mweb/__tests__/e2e/specs/api/partners/pod-partner-requests.cy.ts',
  ],
  'Partners: Policies': [
    'partners-app/__tests__/e2e/specs/ui/legal-policies.cy.ts',
  ],
  'Partners: Product Listing Editor': [
    'partners-app/__tests__/e2e/specs/ui/brand-products.cy.ts',
  ],
  'Partners: Product Listings': [
    'mweb/__tests__/e2e/specs/api/partners/brand-products.cy.ts',
  ],
  'Partners: Profile': [
    'partners-app/__tests__/e2e/specs/02-profile.cy.ts',
  ],
  'Partners: Publish Page': [
    'mweb/__tests__/e2e/specs/api/partners/publish-page.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/publish-page.cy.ts',
  ],
  'Partners: Slot Requests': [
    'mweb/__tests__/e2e/specs/api/partners/club-slot-requests.cy.ts',
    'mweb/__tests__/e2e/specs/api/partners/venue-slot-requests.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/venue-slot-requests-1.cy.ts',
  ],
  'Partners: Studio Options': [
    'partners-app/__tests__/e2e/specs/ui/studio-options.cy.ts',
  ],
  'Partners: Support': [
    'partners-app/__tests__/e2e/specs/ui/partner-support.cy.ts',
  ],
  'Partners: Venue Availability': [
    'mweb/__tests__/e2e/specs/api/fixtures/venue-availability.cy.ts',
    'mweb/__tests__/e2e/specs/api/partners/venue-availability.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/venue-availability-1.cy.ts',
  ],
  'Partners: Venue Dashboard': [
    'partners-app/__tests__/e2e/specs/ui/venue-dashboard-1.cy.ts',
  ],
  'Partners: Venue Food': [
    'mweb/__tests__/e2e/specs/api/fixtures/venue-food.cy.ts',
    'mweb/__tests__/e2e/specs/api/partners/venue-food.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/venue-food.cy.ts',
  ],
  'Partners: Venue Food Coupons': [
    'partners-app/__tests__/e2e/specs/ui/venue-food-coupons.cy.ts',
  ],
  'Partners: Venue Food Dashboard': [
    'partners-app/__tests__/e2e/specs/ui/venue-food-dashboard.cy.ts',
  ],
  'Partners: Venue Food Menu': [
    'partners-app/__tests__/e2e/specs/ui/venue-food-menu.cy.ts',
  ],
  'Partners: Venue Food Orders': [
    'partners-app/__tests__/e2e/specs/ui/venue-food-orders.cy.ts',
  ],
  'Partners: Venue Owner Access': [
    'mweb/__tests__/e2e/specs/api/partners/venue-studio-access.cy.ts',
  ],
  'Partners: Venue Pods': [
    'partners-app/__tests__/e2e/specs/ui/venue-pods-1.cy.ts',
  ],
  'Partners: Venue Registration Form': [
    'mweb/__tests__/e2e/specs/api/partners/venue-registration.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/venue-registration-1.cy.ts',
  ],
  'Partners: Venue Settings': [
    'mweb/__tests__/e2e/specs/api/fixtures/venue-settings.cy.ts',
    'mweb/__tests__/e2e/specs/api/partners/venue-cancellation-policy.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/venue-cancellation-policy-1.cy.ts',
  ],
  'Partners: Verification': [
    'partners-app/__tests__/e2e/specs/ui/partner-verification.cy.ts',
  ],
  'Partners: Wallet & Withdrawals': [
    'mweb/__tests__/e2e/specs/api/partners/wallet-withdrawals.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/wallet-withdrawals.cy.ts',
  ],
  'Partners: Your Brands': [
    'mweb/__tests__/e2e/specs/api/partners/brand-onboarding.cy.ts',
    'mweb/__tests__/e2e/specs/api/partners/brand-studio-access.cy.ts',
    'partners-app/__tests__/e2e/specs/ui/brand-onboarding.cy.ts',
  ],
  'Pods Portal: Access & Brief': [
    'mweb/__tests__/e2e/specs/api/partners/pods-console-access.cy.ts',
    'support/__tests__/e2e/specs/pods/access-and-brief.cy.ts',
  ],
  'Pods Portal: All Pods': [
    'mweb/__tests__/e2e/specs/api/partners/pod-admin.cy.ts',
    'mweb/__tests__/e2e/specs/api/partners/pods-console-pages.cy.ts',
    'support/__tests__/e2e/specs/pods/pod-admin.cy.ts',
  ],
  'Pods Portal: Auto Pods': [
    'support/__tests__/e2e/specs/pods/auto-pods.cy.ts',
  ],
  'Pods Portal: Change Requests': [
    'support/__tests__/e2e/specs/pods/change-requests.cy.ts',
  ],
  'Pods Portal: Complete a Pod': [
    'mweb/__tests__/e2e/specs/api/partners/pod-completion-payouts.cy.ts',
  ],
  'Pods Portal: Pod Details': [
    'support/__tests__/e2e/specs/pods/attendance.cy.ts',
  ],
  'Pods Portal: Pod Ideas': [
    'mweb/__tests__/e2e/specs/api/partners/pod-ideas-moderation.cy.ts',
    'support/__tests__/e2e/specs/03-pods-portal.cy.ts',
    'support/__tests__/e2e/specs/pods/pod-ideas-moderation.cy.ts',
  ],
  'Pods Portal: Pod Monitoring (AI)': [
    'support/__tests__/e2e/specs/logs/pod-monitoring.cy.ts',
    'support/__tests__/e2e/specs/pods/pod-monitoring.cy.ts',
  ],
  'Pods Portal: Pod Plans': [
    'support/__tests__/e2e/specs/pods/pod-plans.cy.ts',
  ],
  'Pods Portal: Pod Settings': [
    'support/__tests__/e2e/specs/pods/pod-settings.cy.ts',
  ],
  'Pods Portal: Pods Dashboard': [
    'support/__tests__/e2e/specs/pods/pods-dashboard.cy.ts',
  ],
  'Portal Shell: Agent console assistant': [
    'support/__tests__/e2e/specs/shell/agent-assistant.cy.ts',
    'support/__tests__/e2e/specs/shell/agent-console-assistant.cy.ts',
  ],
  'Portal Shell: Apps drawer': [
    'support/__tests__/e2e/specs/shell/apps-drawer.cy.ts',
    'support/__tests__/e2e/specs/shell/shell-apps.cy.ts',
  ],
  'Portal Shell: Ask Bot': [
    'support/__tests__/e2e/specs/shell/ask-bot.cy.ts',
  ],
  'Portal Shell: Dashboard layout customisation': [
    'support/__tests__/e2e/specs/shell/dashboard-layout-customisation.cy.ts',
    'support/__tests__/e2e/specs/shell/dashboard-layout.cy.ts',
  ],
  'Portal Shell: File Manager': [
    'mweb/__tests__/e2e/specs/api/staff/file-manager.cy.ts',
    'support/__tests__/e2e/specs/shell/file-manager.cy.ts',
  ],
  'Portal Shell: Header, search and theme': [
    'support/__tests__/e2e/specs/shell/header-search-and-theme.cy.ts',
    'support/__tests__/e2e/specs/shell/shell-header.cy.ts',
  ],
  'Portal Shell: Jump to Portal': [
    'support/__tests__/e2e/specs/shell/jump-to-portal.cy.ts',
  ],
  'Portal Shell: Language switch': [
    'support/__tests__/e2e/specs/shell/language-switch.cy.ts',
    'support/__tests__/e2e/specs/shell/localization.cy.ts',
  ],
  'Portal Shell: Profile and sign out': [
    'support/__tests__/e2e/specs/shell/account-security.cy.ts',
    'support/__tests__/e2e/specs/shell/profile-and-sign-out.cy.ts',
    'support/__tests__/e2e/specs/shell/profile-preferences.cy.ts',
    'support/__tests__/e2e/specs/shell/profile.cy.ts',
  ],
  'Portal Shell: Session, boot and access gates': [
    'mweb/__tests__/e2e/specs/api/other/api-authorization.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/read-vs-write.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/session-boot-and-access-gates.cy.ts',
    'support/__tests__/e2e/specs/shell/auth-session-and-gates.cy.ts',
    'support/__tests__/e2e/specs/shell/auth-sessions.cy.ts',
    'support/__tests__/e2e/specs/shell/session-boot-and-access-gates.cy.ts',
  ],
  'Portal Shell: Sidebar navigation': [
    'support/__tests__/e2e/specs/shell/shell-navigation.cy.ts',
    'support/__tests__/e2e/specs/shell/sidebar-navigation.cy.ts',
  ],
  'Portal Shell: Sign in': [
    'mweb/__tests__/e2e/specs/api/other/auth-2fa.cy.ts',
    'support/__tests__/e2e/specs/shell/auth-2fa.cy.ts',
    'support/__tests__/e2e/specs/shell/auth-console-login.cy.ts',
    'support/__tests__/e2e/specs/shell/sign-in.cy.ts',
    'support/__tests__/e2e/specs/shell/two-factor-authenticator.cy.ts',
  ],
  'Portal Shell: Staff chat': [
    'support/__tests__/e2e/specs/shell/staff-chat.cy.ts',
  ],
  'Portal Shell: Tables': [
    'mweb/__tests__/e2e/specs/api/staff/bulk-delete.cy.ts',
    'support/__tests__/e2e/specs/shell/tables.cy.ts',
  ],
  'Portal Shell: Taskbar and clock': [
    'support/__tests__/e2e/specs/shell/shell-taskbar.cy.ts',
    'support/__tests__/e2e/specs/shell/taskbar-and-clock.cy.ts',
  ],
  'Products: Access & Product Visibility': [
    'support/__tests__/e2e/specs/products/access-and-navigation.cy.ts',
  ],
  'Products: Duncit Products': [
    'mweb/__tests__/e2e/specs/api/partners/products-console.cy.ts',
  ],
  'Regional Club Admin: Region Structure': [
    'mweb/__tests__/e2e/specs/api/partners/region-console.cy.ts',
  ],
  'Server: AI automation inbound webhook and scheduler': [
    'mweb/__tests__/e2e/specs/api/other/ai-automation-inbound-webhook.cy.ts',
  ],
  'Server: GraphQL hardening': [
    'mweb/__tests__/e2e/specs/api/other/graphql-hardening.cy.ts',
  ],
  'Server: Health, logs ingest and API root': [
    'mweb/__tests__/e2e/specs/api/other/health-log-ingest-sse.cy.ts',
  ],
  'Server: Payment reconciliation': [
    'mweb/__tests__/e2e/specs/api/other/payments-finalize.cy.ts',
  ],
  'Server: Public form intake and captcha': [
    'mweb/__tests__/e2e/specs/api/other/public-forms-captcha.cy.ts',
  ],
  'Server: Push and web push notifications': [
    'mweb/__tests__/e2e/specs/api/other/notification-sse.cy.ts',
  ],
  'Server: ShipRocket webhook': [
    'mweb/__tests__/e2e/specs/api/other/shiprocket-webhook.cy.ts',
  ],
  'Server: Short link resolver and attribution': [
    'mweb/__tests__/e2e/specs/api/other/short-links.cy.ts',
  ],
  'Server: Signed and keyed file feeds': [
    'mweb/__tests__/e2e/specs/api/other/reel-studio-media.cy.ts',
    'mweb/__tests__/e2e/specs/api/other/signed-feeds.cy.ts',
  ],
  'Server: Status probes and status API': [
    'mweb/__tests__/e2e/specs/api/other/status-probes.cy.ts',
  ],
  'Server: Twilio call webhooks': [
    'mweb/__tests__/e2e/specs/api/other/twilio-calls.cy.ts',
    'mweb/__tests__/e2e/specs/api/other/twilio-recordings.cy.ts',
  ],
  'Server: Upload endpoint': [
    'mweb/__tests__/e2e/specs/api/other/upload.cy.ts',
  ],
  'Server: Venue partner public API': [
    'mweb/__tests__/e2e/specs/api/other/venue-public-api.cy.ts',
  ],
  'Status Website: Report a problem': [
    'mweb/__tests__/e2e/specs/ui/websites/status/problem-report.cy.ts',
  ],
  'Status Website: Service board': [
    'mweb/__tests__/e2e/specs/ui/websites/status/service-board.cy.ts',
  ],
  'Status Website: Service details dialog': [
    'mweb/__tests__/e2e/specs/ui/websites/status/service-details.cy.ts',
  ],
  'Status Website: Theme, branding and language': [
    'mweb/__tests__/e2e/specs/ui/websites/status/theme-i18n.cy.ts',
  ],
  'Status Website: Uptime history and incidents': [
    'mweb/__tests__/e2e/specs/ui/websites/status/uptime-history.cy.ts',
  ],
  'Support: Access and dashboard': [
    'mweb/__tests__/e2e/specs/api/staff/access-and-dashboard.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/support-console-access.cy.ts',
    'support/__tests__/e2e/specs/support/access-and-dashboard.cy.ts',
    'support/__tests__/e2e/specs/support/console-access.cy.ts',
  ],
  'Support: Callback Requests': [
    'support/__tests__/e2e/specs/01-support-portal.cy.ts',
  ],
  'Support: Chat with Us': [
    'support/__tests__/e2e/specs/01-support-portal.cy.ts',
    'support/__tests__/e2e/specs/support/chat-with-us.cy.ts',
  ],
  'Support: FAQs': [
    'support/__tests__/e2e/specs/support/faqs.cy.ts',
  ],
  'Support: Reported Problems': [
    'support/__tests__/e2e/specs/01-support-portal.cy.ts',
    'support/__tests__/e2e/specs/support/reported-problems.cy.ts',
  ],
  'Support: SOS Alerts': [
    'support/__tests__/e2e/specs/01-support-portal.cy.ts',
  ],
  'Support: Tickets': [
    'support/__tests__/e2e/specs/01-support-portal.cy.ts',
    'support/__tests__/e2e/specs/support/tickets.cy.ts',
  ],
  'Tech: Access and role gates': [
    'mweb/__tests__/e2e/specs/api/staff/access-and-role-gates.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/tech-console-access.cy.ts',
  ],
  'Tech: Database Backups': [
    'mweb/__tests__/e2e/specs/api/other/db-backup-download.cy.ts',
  ],
  'Tech: E2E Runs': [
    'mweb/__tests__/e2e/specs/api/staff/e2e-testing-api-access.cy.ts',
  ],
  'Tech: Emails': [
    'support/__tests__/e2e/specs/communications/emails.cy.ts',
  ],
  'Tech: Environment Variables': [
    'mweb/__tests__/e2e/specs/api/staff/environment-variables.cy.ts',
  ],
  'Tech: MSG91 OTP': [
    'support/__tests__/e2e/specs/communications/msg91-otp.cy.ts',
  ],
  'Tech: Table API': [
    'mweb/__tests__/e2e/specs/api/other/table-get-api.cy.ts',
    'mweb/__tests__/e2e/specs/api/staff/table-api.cy.ts',
  ],
  'Venues: Access & Dashboard': [
    'mweb/__tests__/e2e/specs/api/partners/venues-console-access.cy.ts',
  ],
  'Venues: Venue Editor': [
    'mweb/__tests__/e2e/specs/api/partners/venue-editor.cy.ts',
    'support/__tests__/e2e/specs/venues/venue-editor.cy.ts',
  ],
  'Venues: Venue Food': [
    'mweb/__tests__/e2e/specs/api/partners/venue-food-admin.cy.ts',
    'support/__tests__/e2e/specs/venues/venue-food-admin.cy.ts',
  ],
  'Venues: Venue List': [
    'support/__tests__/e2e/specs/venues/venue-directory.cy.ts',
  ],
  'Website Portal: Websites CMS': [
    'mweb/__tests__/e2e/specs/api/other/websites-cms-dns.cy.ts',
  ],
  'Website: Blog and newsroom': [
    'mweb/__tests__/e2e/specs/ui/websites/main/blog-newsroom.cy.ts',
  ],
  'Website: Careers and job applications': [
    'mweb/__tests__/e2e/specs/ui/websites/main/careers.cy.ts',
  ],
  'Website: CMS site renderer': [
    'mweb/__tests__/e2e/specs/ui/websites/cms/cms-site-ssr.cy.ts',
  ],
  'Website: Contact form': [
    'mweb/__tests__/e2e/specs/ui/websites/main/contact.cy.ts',
  ],
  'Website: Content pages': [
    'mweb/__tests__/e2e/specs/ui/websites/main/static-content.cy.ts',
  ],
  'Website: FAQ and Help Center': [
    'mweb/__tests__/e2e/specs/ui/websites/main/faq-help.cy.ts',
  ],
  'Website: Grievance redressal': [
    'mweb/__tests__/e2e/specs/ui/websites/main/grievance.cy.ts',
  ],
  'Website: Home page': [
    'mweb/__tests__/e2e/specs/ui/websites/all-sites/earn-showcase.cy.ts',
    'mweb/__tests__/e2e/specs/ui/websites/all-sites/reel-slider.cy.ts',
    'mweb/__tests__/e2e/specs/ui/websites/main/home.cy.ts',
  ],
  'Website: Navigation and footer': [
    'mweb/__tests__/e2e/specs/ui/websites/main/navigation.cy.ts',
  ],
  'Website: Newsletter signup': [
    'mweb/__tests__/e2e/specs/ui/websites/main/newsletter.cy.ts',
  ],
  'Website: Policies': [
    'mweb/__tests__/e2e/specs/ui/websites/main/legal-policies.cy.ts',
  ],
  'Website: Tracking consent and analytics': [
    'mweb/__tests__/e2e/specs/ui/websites/all-sites/gdpr-consent.cy.ts',
    'mweb/__tests__/e2e/specs/ui/websites/all-sites/google-analytics.cy.ts',
  ],
};
