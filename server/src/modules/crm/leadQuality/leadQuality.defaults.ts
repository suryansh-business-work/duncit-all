import type {
  AutoCheck,
  QualityBand,
  QualityConfigBody,
  QualityCriterion,
  QualityLeadType,
  QualitySubCriterion,
} from './leadQuality.rules';

/**
 * The scoring models each lead type starts with — version 1, seeded once when
 * a lead type has no configuration. From then on admins own them in CRM ›
 * Settings › Lead Quality Score; nothing here overwrites a saved version.
 *
 * Host and Venue (V3) are the team's existing rubrics, including their
 * mandatory gates. Community, Creator and E-commerce are the proposed starting
 * weightages from the brief. Every model adds up to exactly 100, and every
 * criterion's sub-criteria add up to its weightage (a unit test holds this).
 */

interface ItemOptions {
  mandatory?: boolean;
  auto?: AutoCheck;
  threshold?: number;
  guidance?: string;
}

const sub = (key: string, name: string, points: number, options: ItemOptions = {}): QualitySubCriterion => ({
  key,
  name,
  points,
  mandatory: options.mandatory ?? false,
  auto_check: options.auto ?? 'NONE',
  threshold: options.threshold ?? null,
  guidance: options.guidance ?? '',
});

const criterion = (
  key: string,
  name: string,
  weightage: number,
  options: ItemOptions & { subs?: QualitySubCriterion[] } = {}
): QualityCriterion => ({
  key,
  name,
  weightage,
  enabled: true,
  mandatory: options.mandatory ?? false,
  auto_check: options.auto ?? 'NONE',
  threshold: options.threshold ?? null,
  guidance: options.guidance ?? '',
  sub_criteria: options.subs ?? [],
});

/** Green 80-100, yellow 40-79, red 0-39 — the ring colours the brief asks for. */
export const DEFAULT_BANDS: QualityBand[] = [
  { key: 'excellent', label: 'Excellent', min: 80, tone: 'success' },
  { key: 'good', label: 'Good', min: 60, tone: 'warning' },
  { key: 'moderate', label: 'Moderate', min: 40, tone: 'warning' },
  { key: 'low', label: 'Low', min: 20, tone: 'error' },
  { key: 'very_low', label: 'Very Low', min: 0, tone: 'error' },
];

const uniqueness = (key: string, name: string, weightage: number) =>
  criterion(key, name, weightage, {
    mandatory: true,
    auto: 'CRM_UNIQUENESS',
    guidance: 'No other CRM lead of any type shares its phone, email, website or Instagram profile.',
  });

const authenticProfile = (points: number) =>
  sub('authentic_profile', 'Authentic Instagram profile', points, {
    mandatory: true,
    auto: 'INSTAGRAM_BUSINESS_PROFILE',
    guidance: 'The profile is real, belongs to this lead and is readable as a business or creator account.',
  });

const HOST: QualityConfigBody = {
  min_qualification_score: null,
  bands: DEFAULT_BANDS,
  criteria: [
    criterion('reels_hashtags', 'Relevant Workshop/Event Reels + Local Hashtags', 20, {
      subs: [
        authenticProfile(6),
        sub('event_reels', 'Workshop/event reels posted', 8),
        sub('local_hashtags', 'Local hashtags on event posts', 6),
      ],
    }),
    criterion('booking_link', 'Booking / Registration Link', 10, { guidance: 'A working link where people book or register.' }),
    criterion('verified_phone', 'Verified Phone / WhatsApp', 5, {
      subs: [sub('phone', 'Phone verified', 3), sub('whatsapp', 'WhatsApp verified', 2)],
    }),
    criterion('followers_1k', 'Instagram Followers Above 1,000', 5, { auto: 'INSTAGRAM_FOLLOWERS_MIN', threshold: 1000 }),
    criterion('category_fit', 'Duncit Category Fit', 5),
    uniqueness('crm_uniqueness', 'CRM Uniqueness', 5),
    criterion('hosting_evidence', 'Previous Hosting Evidence', 15, {
      mandatory: true,
      subs: [
        sub('past_event_posts', 'Posts or photos of events they hosted', 8),
        sub('attendee_proof', 'Attendee or participant proof', 4),
        sub('event_listing', 'Listed on an event platform', 3),
      ],
    }),
    criterion('target_city', 'Target-City Verification', 10, { mandatory: true, guidance: 'They host in the city Duncit is targeting.' }),
    criterion('active_90_days', 'Activity Within 90 Days', 10, { auto: 'INSTAGRAM_RECENT_POST_DAYS', threshold: 90 }),
    criterion('repeat_hosting', 'Repeated Hosting Within 6 Months', 5),
    criterion('genuine_engagement', 'Genuine Engagement', 5),
    criterion('paid_readiness', 'Paid Booking Readiness', 5),
  ],
};

const VENUE: QualityConfigBody = {
  min_qualification_score: 61,
  bands: DEFAULT_BANDS,
  criteria: [
    criterion('instagram', 'Instagram Verification', 20, {
      subs: [
        authenticProfile(10),
        sub('correct_outlet', 'Profile is this exact outlet', 5),
        sub('recent_activity', 'Posted in the last 90 days', 5, { auto: 'INSTAGRAM_RECENT_POST_DAYS', threshold: 90 }),
      ],
    }),
    criterion('contact', 'Contact Verification', 20, {
      mandatory: true,
      guidance: 'At least one working contact channel.',
      subs: [
        sub('phone', 'Phone', 8),
        sub('whatsapp', 'WhatsApp', 5),
        sub('email', 'Email', 4, { auto: 'EMAIL_DELIVERABLE' }),
        sub('booking_channel', 'Booking channel', 3),
      ],
    }),
    criterion('identity', 'Venue Identity and Operational Status', 15, {
      subs: [
        sub('exact_address', 'Exact address confirmed', 6, { mandatory: true }),
        sub('operational_status', 'Currently operating', 6, { mandatory: true }),
        sub('official_name', 'Official name matches', 3),
      ],
    }),
    criterion('event_evidence', 'Event Hosting Evidence', 15, {
      mandatory: true,
      guidance: 'Proof the venue is suitable for and hosts events.',
      subs: [
        sub('past_events', 'Past events held here', 8),
        sub('event_space', 'Event-ready space shown', 4),
        sub('group_bookings', 'Accepts event or group bookings', 3),
      ],
    }),
    criterion('category', 'Duncit Category Compatibility', 10),
    criterion('capacity', 'Capacity', 8),
    criterion('google_maps', 'Google Maps', 5, { auto: 'GOOGLE_MAPS_LISTING' }),
    criterion('independent', 'Independent Verification', 5, { guidance: 'Listed or reviewed on an independent platform.' }),
    uniqueness('dedup', 'CRM Deduplication', 2),
  ],
};

const COMMUNITY: QualityConfigBody = {
  min_qualification_score: 60,
  bands: DEFAULT_BANDS,
  criteria: [
    criterion('identity', 'Community Identity & Instagram', 15, {
      subs: [authenticProfile(10), sub('clear_identity', 'Name, purpose and location are clear', 5)],
    }),
    criterion('admin_contact', 'Verified Admin Contact', 15, {
      mandatory: true,
      subs: [sub('phone', 'Admin phone', 8), sub('email', 'Admin email', 4, { auto: 'EMAIL_DELIVERABLE' }), sub('whatsapp', 'Admin WhatsApp', 3)],
    }),
    criterion('members', 'Active Community Members', 15, {
      subs: [sub('member_count', 'Member count evidenced', 8), sub('member_activity', 'Members actively take part', 7)],
    }),
    criterion('category', 'Duncit Category Relevance', 15, { mandatory: true }),
    criterion('past_events', 'Previous Events / Meetups', 10),
    criterion('target_city', 'Target-City Verification', 10, { mandatory: true }),
    criterion('engagement', 'Genuine Engagement', 5),
    criterion('recent_activity', 'Recent Activity', 5, { auto: 'INSTAGRAM_RECENT_POST_DAYS', threshold: 60 }),
    criterion('collaboration', 'Collaboration Readiness', 5),
    uniqueness('uniqueness', 'CRM Uniqueness', 5),
  ],
};

const CREATOR: QualityConfigBody = {
  min_qualification_score: 60,
  bands: DEFAULT_BANDS,
  criteria: [
    criterion('ig_identity', 'Instagram Identity', 15, {
      subs: [authenticProfile(10), sub('clear_niche', 'Creator account with a clear niche', 5)],
    }),
    criterion('contact', 'Verified Contact', 15, {
      mandatory: true,
      subs: [sub('email', 'Email', 7, { auto: 'EMAIL_DELIVERABLE' }), sub('phone', 'Phone', 5), sub('whatsapp', 'WhatsApp', 3)],
    }),
    criterion('local_audience', 'Local Audience Relevance', 10, { mandatory: true }),
    criterion('category_fit', 'Duncit Category Fit', 15, { mandatory: true }),
    criterion('engagement', 'Genuine Engagement', 15, {
      subs: [sub('engagement_rate', 'Healthy engagement rate', 8), sub('authentic_comments', 'Authentic comments', 7)],
    }),
    criterion('content_quality', 'Content Quality & Consistency', 10, {
      subs: [sub('quality', 'Content quality', 5), sub('consistency', 'Posts consistently', 5)],
    }),
    criterion('collaborations', 'Previous Collaborations', 5),
    criterion('reach', 'Audience Reach', 5, { auto: 'INSTAGRAM_FOLLOWERS_MIN', threshold: 5000 }),
    criterion('collaboration_ready', 'Collaboration Readiness', 5),
    uniqueness('uniqueness', 'CRM Uniqueness', 5),
  ],
};

const ECOMM: QualityConfigBody = {
  min_qualification_score: 60,
  bands: DEFAULT_BANDS,
  criteria: [
    criterion('identity', 'Store / Brand Identity', 15, {
      mandatory: true,
      subs: [
        sub('instagram_profile', 'Brand Instagram profile', 5, { auto: 'INSTAGRAM_BUSINESS_PROFILE' }),
        sub('website_live', 'Store website is live', 5, { auto: 'WEBSITE_REACHABLE' }),
        sub('consistent_brand', 'Brand name consistent across channels', 5),
      ],
    }),
    criterion('contact', 'Verified Contact', 15, {
      mandatory: true,
      subs: [sub('phone', 'Phone', 7), sub('email', 'Email', 5, { auto: 'EMAIL_DELIVERABLE' }), sub('whatsapp', 'WhatsApp', 3)],
    }),
    criterion('catalogue', 'Product Catalogue & Category Fit', 15, {
      mandatory: true,
      subs: [sub('live_catalogue', 'Live product catalogue', 8), sub('category_fit', 'Products fit Duncit categories', 7)],
    }),
    criterion('fulfilment', 'Fulfillment Readiness', 10),
    criterion('activity', 'Business Activity', 10, {
      subs: [
        sub('recent_posts', 'Posted in the last 60 days', 5, { auto: 'INSTAGRAM_RECENT_POST_DAYS', threshold: 60 }),
        sub('recent_orders', 'Recent orders or reviews evidenced', 5),
      ],
    }),
    criterion('product_info', 'Product Information & Pricing', 10),
    criterion('reviews', 'Customer Reviews & Credibility', 10, {
      subs: [
        sub('google_reviews', 'At least 10 Google reviews', 5, { auto: 'GOOGLE_REVIEWS_MIN', threshold: 10 }),
        sub('marketplace_reviews', 'Marketplace or customer reviews', 5),
      ],
    }),
    criterion('service_area', 'Service-Area Compatibility', 5),
    criterion('partnership', 'Partnership Readiness', 5),
    uniqueness('uniqueness', 'CRM Uniqueness', 5),
  ],
};

export const DEFAULT_QUALITY_CONFIGS: Readonly<Record<QualityLeadType, QualityConfigBody>> = {
  HOST_LEAD: HOST,
  VENUE_LEAD: VENUE,
  COMMUNITY_LEAD: COMMUNITY,
  CREATOR_LEAD: CREATOR,
  ECOMM_LEAD: ECOMM,
};
