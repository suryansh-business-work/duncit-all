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

export const LEAD_SOURCES = ['Referral', 'Website', 'WhatsApp', 'Instagram', 'Walk-in', 'Partner', 'Cold Outreach', 'Other'];
export const VENUE_LEAD_STATUSES = ['New', 'Contacted', 'Follow-up', 'Negotiation', 'Won', 'Lost'];
export const HOST_LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Follow-up', 'Negotiation', 'Won', 'Lost'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

export const HOST_TYPES = [
  'Individual', 'Community Admin', 'Event Organizer', 'Coach / Trainer',
  'School / College Representative', 'Company / HR', 'Club / Group Admin', 'Influencer / Creator', 'Other',
];

export const HOST_INTERESTS = [
  'Cricket / Sports', 'Birthday Party', 'Corporate Event', 'Networking Meetup', 'Workshop / Training',
  'Community Meetup', 'Kids Activity', 'Music / Open Mic', 'Exhibition / Stall', 'Private Party', 'Other',
];

export const AUDIENCE_SIZES = ['10–20', '20–50', '50–100', '100+'];
export const FREQUENCIES = ['One-time', 'Weekly', 'Monthly', 'Frequently'];
export const REVENUE_MODELS = ['Paid Tickets', 'Sponsorship', 'Revenue Share', 'Free Event', 'Open to Discuss'];
export const HOST_INTENT_SCORES = [
  'Looking for venue only', 'Looking to host & promote', 'Has own audience', 'Wants recurring events', 'Ready to go this month',
];

export const ACTIVITY_TYPES = ['EMAIL', 'CALL', 'NOTE'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
