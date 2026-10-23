import { gql } from '@/generated/graphql';

/**
 * A host's offer to a venue — Create Pod's calendar and live price, and the
 * pending page's counter answer. The same operations mWeb sends
 * (`@duncit/utils` VENUE_OFFER_*_SDL, rule 29), written out in full because
 * the mobile codegen reads these templates statically.
 */

/** Which days and hours the venue is open and free (at most 62 days a call). */
export const VenueOfferCalendarDocument = gql(`
  query MobileVenueOfferCalendar(
    $venue_id: ID!
    $from: String!
    $to: String!
    $space_label: String
  ) {
    venueOfferCalendar(venue_id: $venue_id, from: $from, to: $to, space_label: $space_label) {
      buffer_minutes
      min_notice_minutes
      days {
        date
        closed_reason
        open
        close
        busy {
          start
          end
        }
        slots {
          start
          end
          price
          available
        }
      }
    }
  }
`);

/** The server's price for the host's offer — or why it cannot be sent. */
export const VenueOfferQuoteDocument = gql(`
  query MobileVenueOfferQuote($venue_id: ID!, $offer: VenueOfferInput!) {
    venueOfferQuote(venue_id: $venue_id, offer: $offer) {
      ok
      message
      quote {
        model
        rate
        pax
        hours
        base
        rules {
          type
          label
          amount
        }
        min_spend_top_up
        cleaning_fee
        pet_fee
        gst_pct
        taxes
        platform_fee_pct
        platform_fee
        venue_payout
        total
        deposit
      }
    }
  }
`);

/** A pod's offer to its venue, for the host's pending screen. */
export const PodVenueOfferDocument = gql(`
  query MobilePodVenueOffer($pod_id: ID!) {
    podVenueOffer(pod_id: $pod_id) {
      slot_id
      model
      rate
      status
      awaiting
      counter {
        model
        rate
        note
        quote {
          model
          rate
          pax
          hours
          base
          rules {
            type
            label
            amount
          }
          min_spend_top_up
          cleaning_fee
          pet_fee
          gst_pct
          taxes
          platform_fee_pct
          platform_fee
          venue_payout
          total
          deposit
        }
      }
    }
  }
`);

/** The host takes the venue's counter: the booking is confirmed. */
export const AcceptVenueCounterOfferDocument = gql(`
  mutation MobileAcceptVenueCounterOffer($pod_id: ID!) {
    acceptVenueCounterOffer(pod_id: $pod_id) {
      slot_id
      status
    }
  }
`);

/** The host turns the venue's counter down: the hold is released. */
export const RejectVenueCounterOfferDocument = gql(`
  mutation MobileRejectVenueCounterOffer($pod_id: ID!, $reason: String) {
    rejectVenueCounterOffer(pod_id: $pod_id, reason: $reason)
  }
`);
