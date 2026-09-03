import { gql } from '@/generated/graphql';

/**
 * Venue availability + venue settings, for a venue owner on their phone.
 *
 * The same operations `@duncit/availability-calendar` fires from mWeb and the
 * Partners console — one calendar, one rule set, one policy, three surfaces
 * (rule 27). Every selection is written out in full: the mobile codegen reads
 * these templates statically, so a spliced-in fragment string is not an option.
 */

/** Every venue the owner has, with the settings both screens edit: the hours,
 * off days, rules and auto-extend the calendar reads, and the cancellation
 * policy the settings screen writes. */
export const MyVenuesWithSettingsDocument = gql(`
  query MobileMyVenuesWithSettings {
    myVenues {
      id
      venue_name
      city
      status
      capacity
      capacity_items {
        label
        capacity
      }
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
        cancellation {
          reschedule_only
          tiers {
            hours_before
            charge_type
            value
          }
        }
      }
    }
  }
`);

/** The slots of one venue over the visible month. */
export const VenueSlotsDocument = gql(`
  query MobileVenueSlots($venue_id: ID!, $from: String, $to: String) {
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
`);

/** One document for the day sheet's single slot and the recurring run's batch
 * — `on_conflict` is what tells them apart on the server. */
export const CreateVenueSlotsDocument = gql(`
  mutation MobileCreateVenueSlots($input: BulkCreateVenueSlotsInput!) {
    createVenueSlots(input: $input) {
      id
    }
  }
`);

export const UpdateVenueSlotDocument = gql(`
  mutation MobileUpdateVenueSlot($slot_id: ID!, $input: UpdateVenueSlotInput!) {
    updateVenueSlot(slot_id: $slot_id, input: $input) {
      id
      status
    }
  }
`);

export const DeleteVenueSlotDocument = gql(`
  mutation MobileDeleteVenueSlot($slot_id: ID!) {
    deleteVenueSlot(slot_id: $slot_id)
  }
`);

/** Rules, auto-extend and the cancellation policy all write through here; the
 * caller re-reads `myVenues` afterwards rather than patching a cached row. */
export const UpdateVenueSettingsDocument = gql(`
  mutation MobileUpdateVenueSettings($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
    }
  }
`);

export const MySlotTemplatesDocument = gql(`
  query MobileMySlotTemplates($venue_id: ID) {
    mySlotTemplates(venue_id: $venue_id) {
      id
      name
      is_default
      config {
        weekdays
        start_time
        end_time
        default_price
        skip_weekly_off
        skip_holidays
      }
    }
  }
`);

export const CreateSlotTemplateDocument = gql(`
  mutation MobileCreateSlotTemplate($input: CreateSlotTemplateInput!) {
    createSlotTemplate(input: $input) {
      id
    }
  }
`);

export const DeleteSlotTemplateDocument = gql(`
  mutation MobileDeleteSlotTemplate($id: ID!) {
    deleteSlotTemplate(id: $id)
  }
`);

export const BulkDeleteVenueSlotsDocument = gql(`
  mutation MobileBulkDeleteVenueSlots($input: BulkDeleteVenueSlotsInput!) {
    bulkDeleteVenueSlots(input: $input) {
      matched
      affected
      skipped
    }
  }
`);

export const BulkUpdateVenueSlotsDocument = gql(`
  mutation MobileBulkUpdateVenueSlots($input: BulkUpdateVenueSlotsInput!) {
    bulkUpdateVenueSlots(input: $input) {
      matched
      affected
      skipped
    }
  }
`);
