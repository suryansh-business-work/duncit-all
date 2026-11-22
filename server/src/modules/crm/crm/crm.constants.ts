// Reusable option configuration for CRM lead forms. Exposed to clients via the
// `crmLeadConfig` query so the UI stays dynamic and validation stays consistent.
export const CRM_RW = ['SUPER_ADMIN', 'CRM_MANAGER'] as const;

export const VENUE_TYPES = [
  'Cricket Ground',
  'Flat / Apartment',
  'Banquet Hall',
  'Community Hall',
  'School / College',
  'Rooftop',
  'Cafe / Restaurant',
  'Club / Lounge',
  'Open Ground / Farmhouse',
  'Office / Coworking',
  'Other',
];

export const SPACE_TYPES = ['Indoor', 'Outdoor', 'Both'];

export const VENUE_EVENT_SUITABILITY = [
  'Cricket / Sports',
  'Birthday Party',
  'Corporate Meetup',
  'Networking Event',
  'Workshop / Training',
  'Community Gathering',
  'Wedding / Function',
  'Kids Event',
  'Music / Open Mic',
  'Ticketed Events',
  'Exhibition / Stall',
  'Other',
];

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const BOOKING_NOTICES = ['Instant', '24 hrs', '3 days', '1 week'];
export const PRICING_MODELS = ['Hourly', 'Half Day', 'Full Day', 'Revenue Share', 'Per Head', 'Negotiable'];

export const AMENITIES = [
  'Parking', 'AC', 'Washroom', 'Changing Room', 'Power Backup', 'Stage', 'Sound System',
  'Projector', 'Wi-Fi', 'Seating', 'Food Available', 'Kitchen Access', 'Security Guard', 'Wheelchair Access',
];

/** The lead_source of a lead added from a CRM › Lead Research candidate. */
export const RESEARCH_LEAD_SOURCE = 'Lead Research';
export const LEAD_SOURCES = ['Referral', 'Website', 'WhatsApp', 'Instagram', 'Walk-in', 'Partner', 'Cold Outreach', RESEARCH_LEAD_SOURCE, 'Other'];
export const VENUE_LEAD_STATUSES = ['New', 'Contacted', 'Follow-up', 'Negotiation', 'Won', 'Lost'];
export const HOST_LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Follow-up', 'Negotiation', 'Won', 'Lost'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
/** The pipeline status every lead kind ends on when it converts (lead quality conversion analytics). */
export const WON_LEAD_STATUS = 'Won';

export const HOST_TYPES = [
  'Individual', 'Community Admin', 'Event Organizer', 'Coach / Trainer',
  'School / College Representative', 'Company / HR', 'Club / Group Admin', 'Influencer / Creator', 'Other',
];

export const HOST_INTERESTS = [
  'Cricket / Sports', 'Birthday Party', 'Corporate Event', 'Networking Meetup', 'Workshop / Training',
  'Community Meetup', 'Kids Activity', 'Music / Open Mic', 'Exhibition / Stall', 'Private Party', 'Other',
];

// Creator / community lead dropdowns (served by crmLeadConfig).
export const CREATOR_PLATFORMS = ['Instagram', 'YouTube', 'X (Twitter)', 'LinkedIn', 'Facebook', 'Snapchat', 'Moj / Josh', 'Blog / Website', 'Podcast', 'Other'];
export const COLLABORATION_TYPES = ['Paid Post', 'Barter', 'Event Appearance', 'Affiliate', 'Ambassador', 'Content Creation', 'Hosting a Pod', 'Open to Discuss'];
export const COMMUNITY_TYPES = ['Sports / Fitness', 'Running Club', 'Book Club', 'Hobby Group', 'Professional / Networking', 'Parents', 'Pet Owners', 'Students / Alumni', 'Residents / Society', 'Faith / Culture', 'Other'];
export const COMMUNITY_PLATFORMS = ['WhatsApp', 'Telegram', 'Discord', 'Instagram', 'Facebook Group', 'Meetup', 'Offline Only', 'Other'];

export const AUDIENCE_SIZES = ['10–20', '20–50', '50–100', '100+'];
export const FREQUENCIES = ['One-time', 'Weekly', 'Monthly', 'Frequently'];
export const REVENUE_MODELS = ['Paid Tickets', 'Sponsorship', 'Revenue Share', 'Free Event', 'Open to Discuss'];
export const HOST_INTENT_SCORES = [
  'Looking for venue only', 'Looking to host & promote', 'Has own audience', 'Wants recurring events', 'Ready to go this month',
];

// Service catalogue used by both venue and host leads. The form lets the user
// pick one of these or "Other" + a free-text name, and always attach a short
// description. Stored as embedded sub-documents (see crm.model.ts).
export const SERVICES_OFFERED = [
  'Event Hosting',
  'Catering',
  'Photography / Videography',
  'Decor & Setup',
  'Sound & Lighting',
  'Bouncer / Security',
  'DJ / Music',
  'Bartender',
  'Coaching / Training',
  'Workshop Facilitation',
  'Sports Coaching',
  'Equipment Rental',
  'Live Streaming',
  'Ticketing',
  'Other',
];

/** Every CRM lead collection, as the `CrmEntityType` GraphQL enum names it. */
export const CRM_LEAD_ENTITY_TYPES = ['VENUE_LEAD', 'HOST_LEAD', 'ECOMM_LEAD', 'CREATOR_LEAD', 'COMMUNITY_LEAD'] as const;
export type CrmLeadEntityType = (typeof CRM_LEAD_ENTITY_TYPES)[number];

/** The CrmDynamicField flag that opts a field into each lead kind's forms. */
export const DYNAMIC_FIELD_FLAG: Record<CrmLeadEntityType, string> = {
  VENUE_LEAD: 'applies_to_venue',
  HOST_LEAD: 'applies_to_host',
  ECOMM_LEAD: 'applies_to_ecomm',
  CREATOR_LEAD: 'applies_to_creator',
  COMMUNITY_LEAD: 'applies_to_community',
};

// NOTE is a manual log; NOTE_CREATED / NOTE_UPDATED / NOTE_DELETED are the audit entries
// its changes leave behind (target = the log's id), so the history survives an edit or delete.
export const ACTIVITY_TYPES = ['EMAIL', 'CALL', 'NOTE', 'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
