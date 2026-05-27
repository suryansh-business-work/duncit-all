import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { VENUE_LEAD_STATUSES, HOST_LEAD_STATUSES, PRIORITIES, ACTIVITY_TYPES } from './crm.constants';

const contactSchema = new Schema(
  {
    name: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    mobile_number: { type: String, trim: true, default: '' },
    whatsapp_number: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
  },
  { _id: false }
);

const serviceOfferedSchema = new Schema(
  {
    // Catalogue value or "Other". When "Other", `custom_name` carries the
    // free-text label so dashboard aggregations can still group by display
    // name without exploding the catalogue.
    service: { type: String, trim: true, default: '' },
    custom_name: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const activitySchema = new Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    summary: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: '' },
    target: { type: String, trim: true, default: '' },
    // Manual NOTE entries store the user's WYSIWYG payload as HTML; we also
    // persist a plaintext fallback so server-side search / dashboards don't
    // need to parse markup. Both default empty so existing EMAIL/CALL rows
    // stay backward-compatible.
    body_html: { type: String, default: '' },
    body_text: { type: String, default: '' },
    created_by: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const venueLeadSchema = new Schema(
  {
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    venue_name: { type: String, required: true, trim: true },
    venue_types: { type: [String], default: [] },
    venue_description: { type: String, trim: true, default: '' },
    capacity_min: { type: Number, default: null },
    capacity_max: { type: Number, default: null },
    space_type: { type: String, default: '' },

    city: { type: String, required: true, trim: true, index: true },
    area: { type: String, trim: true, default: '' },
    full_address: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true, default: '' },
    map_link: { type: String, trim: true, default: '' },

    contacts: { type: [contactSchema], default: [] },
    event_suitability: { type: [String], default: [] },

    available_days: { type: [String], default: [] },
    available_time_slots: { type: String, trim: true, default: '' },
    booking_notice: { type: String, default: '' },

    pricing_models: { type: [String], default: [] },
    expected_charges: { type: Number, default: null },
    security_deposit: { type: Number, default: null },
    gst_applicable: { type: Boolean, default: false },
    invoice_available: { type: Boolean, default: false },

    amenities: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    brochure_url: { type: String, trim: true, default: '' },

    website: { type: String, trim: true, default: '' },
    services_offered: { type: [serviceOfferedSchema], default: [] },

    // Optional one-to-many link to host leads who own / host events at
    // this venue. Used by the new "Linked Hosts" tab on the venue detail
    // page. Stays empty by default; no migration needed for existing rows.
    linked_host_ids: { type: [{ type: Schema.Types.ObjectId, ref: 'HostLead' }], default: [] },

    // Free-text tags / labels — rendered as chips on detail, free-text
    // autocomplete on edit. Defaults to empty array so existing rows stay
    // valid without a migration.
    tags: { type: [String], default: [] },
    // ImageKit URL for the venue's logo. Optional.
    logo_url: { type: String, trim: true, default: '' },
    // Free-form key/value bag for admin-defined dynamic fields. Mongoose's
    // Mixed lets us store any JSON the CrmDynamicField module surfaces.
    dynamic_values: { type: Schema.Types.Mixed, default: () => ({}) },

    lead_source: { type: String, default: '' },
    assigned_to: { type: String, trim: true, default: '' },
    lead_status: { type: String, enum: VENUE_LEAD_STATUSES, default: 'New', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium', index: true },
    next_follow_up_date: { type: Date, default: null },
    remarks: { type: String, trim: true, default: '' },
    activity_log: { type: [activitySchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const hostLeadSchema = new Schema(
  {
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    host_name: { type: String, required: true, trim: true },
    host_type: { type: String, default: '' },
    organization_name: { type: String, trim: true, default: '' },

    city: { type: String, trim: true, default: '', index: true },
    area: { type: String, trim: true, default: '' },
    contacts: { type: [contactSchema], default: [] },

    interests: { type: [String], default: [] },
    expected_audience_size: { type: String, default: '' },
    frequency: { type: String, default: '' },

    budget_range: { type: String, trim: true, default: '' },
    revenue_models: { type: [String], default: [] },
    need_venue: { type: Boolean, default: false },
    need_vendor: { type: Boolean, default: false },

    preferred_event_date: { type: Date, default: null },
    preferred_day: { type: String, default: '' },
    preferred_time_slot: { type: String, trim: true, default: '' },

    website: { type: String, trim: true, default: '' },
    services_offered: { type: [serviceOfferedSchema], default: [] },

    instagram_link: { type: String, trim: true, default: '' },
    community_link: { type: String, trim: true, default: '' },
    community_size: { type: Number, default: null },
    previous_events_hosted: { type: Boolean, default: false },
    past_attendees: { type: Number, default: null },
    host_intent_scores: { type: [String], default: [] },

    tags: { type: [String], default: [] },
    profile_photo_url: { type: String, trim: true, default: '' },
    dynamic_values: { type: Schema.Types.Mixed, default: () => ({}) },

    lead_source: { type: String, default: '' },
    assigned_to: { type: String, trim: true, default: '' },
    lead_status: { type: String, enum: HOST_LEAD_STATUSES, default: 'New', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium', index: true },
    next_follow_up_date: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
    activity_log: { type: [activitySchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Catalogue of services offered, managed via the CRM admin UI. Replaces the
// hard-coded SERVICES_OFFERED constant. There are two separate catalogues —
// one for the Venue Leads dropdown and one for the Host Leads dropdown — keyed
// by `kind`. A `name` can collide across kinds (e.g. both could offer
// "Catering"), so the unique index is compound on `(kind, name)`.
const crmServiceCatalogSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['VENUE', 'HOST'], default: 'VENUE', index: true },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

crmServiceCatalogSchema.index({ kind: 1, name: 1 }, { unique: true });

/**
 * Admin-defined dynamic fields. A single definition can apply to venue
 * leads, host leads, or both — letting the team add bespoke fields like
 * "Vendor GST status" without a code change. Field values live on each
 * lead's `dynamic_values` map, keyed by `name`.
 */
const crmDynamicFieldSchema = new Schema(
  {
    // Programmatic key used as the object property on the lead's
    // dynamic_values map. Lowercase + underscores recommended.
    name: { type: String, required: true, trim: true, lowercase: true },
    // Human-friendly label shown on forms / detail pages.
    label: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ['text', 'textarea', 'number', 'boolean', 'date', 'select'],
      default: 'text',
    },
    // For `select` kind only.
    options: { type: [String], default: [] },
    applies_to_venue: { type: Boolean, default: true },
    applies_to_host: { type: Boolean, default: true },
    required: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

crmDynamicFieldSchema.index({ name: 1 }, { unique: true });

export type VenueLeadDoc = InferSchemaType<typeof venueLeadSchema> & { _id: any };
export type HostLeadDoc = InferSchemaType<typeof hostLeadSchema> & { _id: any };
export type CrmServiceCatalogDoc = InferSchemaType<typeof crmServiceCatalogSchema> & { _id: Types.ObjectId };
export type CrmDynamicFieldDoc = InferSchemaType<typeof crmDynamicFieldSchema> & { _id: Types.ObjectId };
export const VenueLeadModel = model('VenueLead', venueLeadSchema);
export const HostLeadModel = model('HostLead', hostLeadSchema);
export const CrmServiceCatalogModel = model('CrmServiceCatalog', crmServiceCatalogSchema);
export const CrmDynamicFieldModel = model('CrmDynamicField', crmDynamicFieldSchema);
