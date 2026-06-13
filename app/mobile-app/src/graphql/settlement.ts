import { gql } from '@/generated/graphql';

/** Live host/venue split preview for a pod given the entered venue bill. */
export const PodSettlementPreviewDocument = gql(`
  query MobilePodSettlementPreview($pod_id: ID!, $venue_bill_amount: Float!) {
    podSettlementPreview(pod_id: $pod_id, venue_bill_amount: $venue_bill_amount) {
      currency_symbol
      collected_total
      has_venue
      host {
        venue_bill
        gst_pct
        gst_amount
        duncit_pct
        duncit_amount
        payout_pct
        payout_amount
      }
    }
  }
`);

/** Host completes a pod: enter venue bill + party media -> reconciled releases. */
export const CompletePodSettlementDocument = gql(`
  mutation MobileCompletePodSettlement($input: CompletePodInput!) {
    completePodSettlement(input: $input) {
      settlement {
        currency_symbol
        host {
          payout_amount
        }
      }
      releases {
        id
        kind
        status
      }
    }
  }
`);

/** The signed-in host's completion payouts (their "Host Share" history). */
export const MyHostPayoutsDocument = gql(`
  query MobileMyHostPayouts {
    myHostPayouts {
      id
      pod_title
      status
      amount_requested
      approved_amount
      breakdown {
        collected_total
        venue_bill
        gst_pct
        gst_amount
        duncit_pct
        duncit_amount
        payout_pct
        payout_amount
      }
      created_at
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`);
