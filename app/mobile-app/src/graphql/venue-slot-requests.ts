import { gql } from '@/generated/graphql';

/**
 * Booking requests, for a venue owner on their phone — hosts who want to run
 * a pod at the venue, each with the price they offer. The same operations the
 * Partners console and mWeb use (`@duncit/availability-calendar` offers),
 * re-declared here because the app's codegen only reads this workspace.
 */
export const VenueSlotRequestsDocument = gql(`
  query MobileVenueSlotRequests($venue_id: ID) {
    myVenues {
      id
      venue_name
    }
    venueSlotRequests(venue_id: $venue_id) {
      slot_id
      venue_id
      venue_name
      start_at
      end_at
      whole_day
      price
      pricing_mode
      overtime_rate
      requested_at
      pod_id
      pod_title
      pod_description
      host_name
      host_email
      host_phone
      pod_is_free
      offer {
        slot_id
        status
        awaiting
        model
        rate
        pax
        pets
        space_label
        quote {
          base
          rules {
            label
            amount
          }
          min_spend_top_up
          cleaning_fee
          pet_fee
          taxes
          venue_payout
          platform_fee
          total
          deposit
        }
        counter {
          model
          rate
          note
          quote {
            base
            rules {
              label
              amount
            }
            min_spend_top_up
            cleaning_fee
            pet_fee
            taxes
            venue_payout
            platform_fee
            total
            deposit
          }
        }
        history {
          by
          action
          model
          rate
          note
          at
        }
      }
    }
  }
`);

export const ApproveVenueSlotRequestDocument = gql(`
  mutation MobileApproveVenueSlotRequest($slot_id: ID!) {
    approveVenueSlotRequest(slot_id: $slot_id) {
      id
      status
    }
  }
`);

export const DeclineVenueSlotRequestDocument = gql(`
  mutation MobileDeclineVenueSlotRequest($slot_id: ID!, $reason: String) {
    declineVenueSlotRequest(slot_id: $slot_id, reason: $reason) {
      id
      status
    }
  }
`);

/** The venue's own terms for a host's offer; the host then accepts or declines them. */
export const CounterVenueOfferDocument = gql(`
  mutation MobileCounterVenueOffer($slot_id: ID!, $terms: VenueOfferTermsInput!, $note: String) {
    counterVenueOffer(slot_id: $slot_id, terms: $terms, note: $note) {
      slot_id
      status
    }
  }
`);

/** A counter priced for the booking's own window before it is sent. */
export const VenueCounterQuoteDocument = gql(`
  query MobileVenueCounterQuote($slot_id: ID!, $terms: VenueOfferTermsInput!) {
    venueCounterQuote(slot_id: $slot_id, terms: $terms) {
      ok
      message
      quote {
        base
        rules {
          label
          amount
        }
        min_spend_top_up
        cleaning_fee
        pet_fee
        taxes
        venue_payout
        platform_fee
        total
        deposit
      }
    }
  }
`);
