import { Schema, model, type InferSchemaType, type SchemaDefinition } from 'mongoose';
import { activitySchema, contactSchema } from '@modules/crm/crm/crm.model';
import { HOST_LEAD_STATUSES, PRIORITIES } from '@modules/crm/crm/crm.constants';

/**
 * Creator and community leads — prospects worked from the CRM's Leads section.
 * Both share the lead backbone every CRM lead has (location, contacts, tags,
 * admin-defined dynamic fields, pipeline tracking, activity log) and add their
 * own profile fields. Kept in two collections so each list, index and export
 * stays independent, like venue / host / ecomm leads.
 */
const leadBackbone: SchemaDefinition = {
  super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  city: { type: String, trim: true, default: '', index: true },
  area: { type: String, trim: true, default: '' },
  contacts: { type: [contactSchema], default: [] },
  website: { type: String, trim: true, default: '' },
  instagram_link: { type: String, trim: true, default: '' },
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
};

const timestamps = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } } as const;

const creatorLeadSchema = new Schema(
  {
    creator_name: { type: String, required: true, trim: true },
    handle: { type: String, trim: true, default: '' },
    primary_platform: { type: String, default: '' },
    niches: { type: [String], default: [] },
    followers_count: { type: Number, default: null },
    engagement_rate: { type: Number, default: null },
    profile_links: { type: [String], default: [] },
    collaboration_types: { type: [String], default: [] },
    rate_card: { type: String, trim: true, default: '' },
    ...leadBackbone,
  },
  timestamps
);

const communityLeadSchema = new Schema(
  {
    community_name: { type: String, required: true, trim: true },
    community_type: { type: String, default: '' },
    platform: { type: String, default: '' },
    member_count: { type: Number, default: null },
    meetup_frequency: { type: String, default: '' },
    community_link: { type: String, trim: true, default: '' },
    interests: { type: [String], default: [] },
    partnership_interests: { type: [String], default: [] },
    ...leadBackbone,
  },
  timestamps
);

export type CreatorLeadDoc = InferSchemaType<typeof creatorLeadSchema> & { _id: unknown };
export type CommunityLeadDoc = InferSchemaType<typeof communityLeadSchema> & { _id: unknown };
export const CreatorLeadModel = model('CreatorLead', creatorLeadSchema);
export const CommunityLeadModel = model('CommunityLead', communityLeadSchema);
