import { Schema, model, InferSchemaType } from 'mongoose';
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

const activitySchema = new Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    summary: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: '' },
    target: { type: String, trim: true, default: '' },
    created_by: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const venueLeadSchema = new Schema(
  {
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

    instagram_link: { type: String, trim: true, default: '' },
    community_link: { type: String, trim: true, default: '' },
    community_size: { type: Number, default: null },
    previous_events_hosted: { type: Boolean, default: false },
    past_attendees: { type: Number, default: null },
    host_intent_scores: { type: [String], default: [] },

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

export type VenueLeadDoc = InferSchemaType<typeof venueLeadSchema> & { _id: any };
export type HostLeadDoc = InferSchemaType<typeof hostLeadSchema> & { _id: any };
export const VenueLeadModel = model('VenueLead', venueLeadSchema);
export const HostLeadModel = model('HostLead', hostLeadSchema);
