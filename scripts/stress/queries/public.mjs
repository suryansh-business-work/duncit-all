/**
 * The GraphQL documents behind the app boot, the sign-in pages, help & policies
 * and the catalogue pages (pod ideas, plans, membership, leaderboard, gift
 * cards). Every one answers a signed-out caller.
 *
 * The boot's write (`RecordActivePing`) is left out on purpose — see details.mjs.
 */

// app/mweb/src/main.tsx · packages/user-context PortalModeGate · packages/app-settings
export const PUBLIC_CLIENT_CONFIG = `query MwebPublicClientConfig { publicClientConfig { google_client_id google_maps_api_key } }`;

export const PORTAL_MODE = `query PortalMode($key: String!) { portalMode(key: $key) { mode } }`;

export const PUBLIC_LOCALES = `query PublicLocales { publicLocales { code label english_label is_rtl is_default sort_order } }`;

export const PUBLIC_TRANSLATIONS = `query PublicTranslations($locale: String!) { publicTranslations(locale: $locale) { key value } }`;

export const PUBLIC_APP_SETTINGS = `query PublicAppSettings {
  publicAppSettings {
    date_format time_format time_zone time_source custom_time custom_time_set_at server_time
    min_signup_age draft_retention_days
  }
}`;

// app/mweb/src/hooks/useBrandingAssets.ts · components/BrandFontLoader.tsx · tours
export const BRANDING_ASSETS = `query BrandingAssets {
  branding {
    app_name logo_url mweb_favicon_url mweb_logo_url mweb_splash_url mweb_splash_type venues_card_video_url
    login_background_image_enabled login_background_image_url login_background_video_enabled login_background_video_url
  }
}`;

export const BRAND_FONT = `query MwebBrandFont { branding { mweb_font_family } }`;

export const TOUR_VIEWER = `query TourViewer { me { user_id } }`;

export const PUBLIC_FEATURE_FLAGS = `query PublicFeatureFlags { publicFeatureFlags { key enabled } }`;

// app/mweb/src/components/AuthLogo.tsx · policy-acceptance/useSignupPolicies.ts
export const AUTH_BRANDING = `query AuthBranding { branding { app_name logo_url mweb_logo_url primary_color } }`;

export const SIGNUP_POLICIES = `query SignupPolicies { signupPolicies { id slug title content } }`;

// app/mweb/src/pages/FaqsPage.tsx · packages/utils grievance-gql · components/PolicyRenderer.tsx
export const PUBLIC_FAQS = `query PublicFaqs {
  publicFaqGroups { super_category { id name slug icon } faqs { id question answer } }
}`;

export const GRIEVANCE_OFFICER = `query GrievanceOfficer { grievanceOfficer { name email phone address } }`;

export const POLICY_BY_SLUG = `query PolicyBySlug($slug: String!) {
  policyBySlug(slug: $slug) { id slug title content is_active updated_at }
}`;

// app/mweb/src/pages/pod-ideas-page/queries.ts
export const POD_IDEAS = `query PodIdeas($filter: PodIdeaFilterInput) {
  podIdeas(filter: $filter) {
    id idea_no author_id title description super_category_id category_id sub_category_id
    super_category_name category_name sub_category_name likes_count liked_by_me shares_count
    comments_count status created_at
    author { user_id full_name first_name profile_photo }
  }
  me { user_id full_name first_name profile_photo }
}`;

// app/mweb/src/pages/PodPlansPage.tsx · membership-page/queries.ts
export const PUBLIC_POD_PLANS = `query PublicPodPlans {
  publicPodPlans { id key name description image_url features price_label is_coming_soon }
}`;

export const MEMBERSHIP_PRICING = `query MembershipPricing {
  membershipPricing {
    is_subscribed
    plans { id key name tagline price_label price_note badge_label accent_color cta_label }
    benefits { id group label values { plan_key value } }
  }
}`;

// app/mweb/src/pages/leaderboard-page/queries.ts
export const LEADERBOARD_CONFIG = `query LeaderboardConfig {
  leaderboardConfig {
    points_per_join points_per_host points_per_club_pod points_per_venue_pod points_per_product_sale
    rewards { category period rank_from rank_to title description }
  }
}`;

// app/mweb/src/pages/gift-cards-page/queries.ts · checkout-page/queries.ts
export const GIFT_CARD_CATEGORIES = `query GiftCardCategories {
  categories { id name slug icon level parent_id gift_card_image_front gift_card_image_back }
}`;

export const PUBLIC_FINANCE_SETTINGS = `query PublicFinanceSettings {
  publicFinanceSettings { platform_fee_pct gst_pct currency_symbol dummy_mode razorpay_enabled }
}`;
