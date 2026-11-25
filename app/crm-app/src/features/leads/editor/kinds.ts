import {
  makeCommunityLeadSchema,
  makeCreatorLeadSchema,
  makeEcommLeadSchema,
  makeHostLeadSchema,
  makeVenueLeadSchema,
  type Translate,
} from '@duncit/forms/schemas';

import type { LeadKind } from '@/features/leads/leadKinds';
import type { FormSchema } from '@/utils/form-resolver';

/** How a text box is typed and what it sends: text as typed, or a number (Int / Float). */
export type FieldType = 'text' | 'multiline' | 'url' | 'int' | 'float';

export interface EditorField {
  name: string;
  type: FieldType;
}

export interface KindEditor {
  /** The field that names a lead of this kind. */
  nameField: string;
  /** The portal's schema for this kind, shared through @duncit/forms/schemas. */
  schema: (t: Translate) => FormSchema;
  /** Which crmLeadConfig list holds this kind's statuses (the portal's own choice per kind). */
  statusList: 'venue_lead_statuses' | 'host_lead_statuses';
  /** Venue leads call their free text "remarks"; every other kind "notes". */
  notesField: 'remarks' | 'notes';
  /** The kind's own boxes, in the order the form shows them. */
  fields: EditorField[];
  /** Dates the server rewrites on every save, so the editor sends back what it loaded. */
  preservedDates: string[];
  /** Venue leads pick their venue types; the other kinds have no multi-choice on the phone. */
  venueTypes: boolean;
}

const CITY: EditorField[] = [
  { name: 'city', type: 'text' },
  { name: 'area', type: 'text' },
];

/**
 * The phone editor for each lead kind. It covers what a person in the field
 * fills in; the portal's long tail (amenities, pricing models, branding…)
 * stays as it is on the lead, because the editor only sends what it shows.
 */
export const KIND_EDITORS: Record<LeadKind, KindEditor> = {
  VENUE_LEAD: {
    nameField: 'venue_name',
    schema: makeVenueLeadSchema,
    statusList: 'venue_lead_statuses',
    notesField: 'remarks',
    fields: [
      ...CITY,
      { name: 'full_address', type: 'multiline' },
      { name: 'capacity_min', type: 'int' },
      { name: 'capacity_max', type: 'int' },
      { name: 'expected_charges', type: 'float' },
      { name: 'security_deposit', type: 'float' },
      { name: 'map_link', type: 'url' },
    ],
    preservedDates: ['next_follow_up_date'],
    venueTypes: true,
  },
  HOST_LEAD: {
    nameField: 'host_name',
    schema: makeHostLeadSchema,
    statusList: 'host_lead_statuses',
    notesField: 'notes',
    fields: [
      ...CITY,
      { name: 'community_size', type: 'int' },
      { name: 'past_attendees', type: 'int' },
      { name: 'instagram_link', type: 'url' },
      { name: 'community_link', type: 'url' },
    ],
    preservedDates: ['next_follow_up_date', 'preferred_event_date'],
    venueTypes: false,
  },
  ECOMM_LEAD: {
    nameField: 'seller_name',
    schema: makeEcommLeadSchema,
    statusList: 'host_lead_statuses',
    notesField: 'notes',
    fields: [
      ...CITY,
      { name: 'brand_name', type: 'text' },
      { name: 'gst_number', type: 'text' },
      { name: 'instagram_link', type: 'url' },
    ],
    preservedDates: ['next_follow_up_date'],
    venueTypes: false,
  },
  CREATOR_LEAD: {
    nameField: 'creator_name',
    schema: makeCreatorLeadSchema,
    statusList: 'host_lead_statuses',
    notesField: 'notes',
    fields: [
      ...CITY,
      { name: 'handle', type: 'text' },
      { name: 'followers_count', type: 'float' },
      { name: 'engagement_rate', type: 'float' },
      { name: 'rate_card', type: 'multiline' },
      { name: 'instagram_link', type: 'url' },
    ],
    preservedDates: ['next_follow_up_date'],
    venueTypes: false,
  },
  COMMUNITY_LEAD: {
    nameField: 'community_name',
    schema: makeCommunityLeadSchema,
    statusList: 'host_lead_statuses',
    notesField: 'notes',
    fields: [
      ...CITY,
      { name: 'member_count', type: 'float' },
      { name: 'community_link', type: 'url' },
      { name: 'instagram_link', type: 'url' },
    ],
    preservedDates: ['next_follow_up_date'],
    venueTypes: false,
  },
};
