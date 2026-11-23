import {
  approvedDetail,
  makeClubAdminDetailRelease,
  makeDetailBreakdown,
  makeDetailRelease,
  makeHostDetailRelease,
  makeReleaseDetail,
  type DetailBreakdownMock,
  type DetailReleaseMock,
} from './payment-release.mock';

/**
 * A request whose payouts send out more than its pod collected — the ticket's
 * case: a pod that took ₹36 pays the venue its ₹40 booking and the club admin
 * ₹0.87 in full while the host's side went to −₹15.89. Its venue bill (₹9,999)
 * was recorded as evidence only, so the booked price is what the venue is paid.
 */
export const SHORTFALL = 15.89;
export const FUNDING_NOTE = 'Duncit marketing budget';

/** The frozen snapshot every payout of that completion carries. */
export const shortfallSnapshot = (over: Partial<DetailBreakdownMock> = {}) =>
  makeDetailBreakdown({
    collected_total: 36,
    venue_bill: 9999,
    venue_slot_price: 40,
    include_slot_price: false,
    venue_bill_applied: false,
    funding_shortfall: SHORTFALL,
    share_amount: 40,
    payout_amount: 40,
    ...over,
  });

export const shortfallVenue = (over: Partial<DetailReleaseMock> = {}) =>
  makeDetailRelease({ amount_requested: 40, breakdown: shortfallSnapshot(), ...over });

/** The host's side came to less than zero, so its payout is floored at ₹0. */
export const shortfallHost = (over: Partial<DetailReleaseMock> = {}) =>
  makeHostDetailRelease({
    amount_requested: 0,
    breakdown: shortfallSnapshot({ share_amount: 0, commission_amount: 0, payout_amount: 0 }),
    ...over,
  });

export const shortfallClub = (over: Partial<DetailReleaseMock> = {}) =>
  makeClubAdminDetailRelease({
    status: 'PENDING',
    approval_type: null,
    approved_amount: null,
    reviewed_at: null,
    amount_requested: 0.87,
    breakdown: shortfallSnapshot({ share_amount: 0.87, commission_pct: 0, commission_amount: 0, payout_amount: 0.87 }),
    ...over,
  });

/** All three payouts waiting: ₹40 + ₹0 + ₹0.87 = ₹40.87. */
export const shortfallDetail = (
  releases: DetailReleaseMock[] = [shortfallVenue(), shortfallHost(), shortfallClub()],
) => makeReleaseDetail(releases, { total_requested: 40.87 });

/** The same request once "Approve all" recorded the funding note on every payout. */
export const fundedDetail = () =>
  approvedDetail(
    shortfallDetail([
      shortfallVenue({ shortfall_funding_note: FUNDING_NOTE }),
      shortfallHost({ shortfall_funding_note: FUNDING_NOTE }),
      shortfallClub({ shortfall_funding_note: FUNDING_NOTE }),
    ]),
  );
