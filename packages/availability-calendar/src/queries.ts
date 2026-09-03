import { gql } from '@apollo/client';

/**
 * The venue's operating settings, as one selection every venue query splices
 * in. It is a plain string rather than a `fragment` so the callers that build
 * their own venue document (`myVenues`, `updateVenueSettings`) can interpolate
 * it without a fragment definition per document.
 *
 * `operating_hours`, `weekly_off_days` and `holidays` are what the calendar
 * greys out; `rules` and `auto_extend` are what the recurring dialog edits.
 */
export const VENUE_SETTINGS_FRAGMENT = `
  settings {
    operating_hours {
      open
      close
    }
    weekly_off_days
    holidays
    rules {
      buffer_minutes
      min_notice_minutes
      max_advance_days
      max_bookings_per_slot
      allow_instant_booking
      allow_waitlist
      booking_approval_required
      allow_multiple_bookings
    }
    auto_extend {
      enabled
      template_id
      horizon_days
      until
    }
  }
`;

export const VENUE_SLOTS = gql`
  query VenueSlots($venue_id: ID!, $from: String, $to: String) {
    venueSlots(venue_id: $venue_id, from: $from, to: $to) {
      id
      venue_id
      start_at
      end_at
      whole_day
      price
      space_label
      capacity
      status
      booked_by_pod_id
      booked_pod_title
      notes
      created_at
    }
  }
`;

/** One document for both the day drawer's single slot and the recurring
 *  dialog's batch — `on_conflict` is what tells them apart on the server. */
export const CREATE_VENUE_SLOTS = gql`
  mutation CreateVenueSlots($input: BulkCreateVenueSlotsInput!) {
    createVenueSlots(input: $input) {
      id
      start_at
      end_at
      price
      status
      notes
    }
  }
`;

export const UPDATE_VENUE_SLOT = gql`
  mutation UpdateVenueSlot($slot_id: ID!, $input: UpdateVenueSlotInput!) {
    updateVenueSlot(slot_id: $slot_id, input: $input) {
      id
      start_at
      end_at
      price
      status
      notes
    }
  }
`;

export const DELETE_VENUE_SLOT = gql`
  mutation DeleteVenueSlot($slot_id: ID!) {
    deleteVenueSlot(slot_id: $slot_id)
  }
`;

export const UPDATE_VENUE_SETTINGS = gql`
  mutation UpdateVenueSettings($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      ${VENUE_SETTINGS_FRAGMENT}
    }
  }
`;

const SLOT_TEMPLATE_FIELDS = `
  id
  name
  description
  category
  visibility
  is_default
  config {
    weekdays
    start_time
    end_time
    default_price
    per_day_price {
      weekday
      price
    }
    skip_weekly_off
    skip_holidays
  }
`;

export const MY_SLOT_TEMPLATES = gql`
  query MySlotTemplates($venue_id: ID) {
    mySlotTemplates(venue_id: $venue_id) { ${SLOT_TEMPLATE_FIELDS} }
  }
`;

export const CREATE_SLOT_TEMPLATE = gql`
  mutation CreateSlotTemplate($input: CreateSlotTemplateInput!) {
    createSlotTemplate(input: $input) { ${SLOT_TEMPLATE_FIELDS} }
  }
`;

export const DELETE_SLOT_TEMPLATE = gql`
  mutation DeleteSlotTemplate($id: ID!) {
    deleteSlotTemplate(id: $id)
  }
`;

export const BULK_DELETE_VENUE_SLOTS = gql`
  mutation BulkDeleteVenueSlots($input: BulkDeleteVenueSlotsInput!) {
    bulkDeleteVenueSlots(input: $input) {
      matched
      affected
      skipped
    }
  }
`;

export const BULK_UPDATE_VENUE_SLOTS = gql`
  mutation BulkUpdateVenueSlots($input: BulkUpdateVenueSlotsInput!) {
    bulkUpdateVenueSlots(input: $input) {
      matched
      affected
      skipped
    }
  }
`;
