import type { NestedCatalogue } from '../catalogue';

/**
 * The host's auditable earnings statement.
 *
 * Its own namespace because three surfaces render the SAME statement from the
 * same builder — mWeb and the native app in Step 4 of Create Pod, and the
 * portals through `@duncit/pod-form`. Parking the wording in any one of their
 * namespaces would leave the other two resolving keys they do not ship, and a
 * second copy of these sentences is exactly the drift rule 40 exists to stop.
 *
 * Every line is a claim about somebody's money, so the formulas are copy too:
 * they are what makes a row hand-verifiable, and a host reading in another
 * language has to be able to check the arithmetic the same way. That is why
 * `gstFormula` is written on the total collection: it is the only base printed
 * on the panel, so it is the only one a host can check without trusting a
 * derived figure first.
 *
 * The `*Description` entries answer "why is this being taken?" for each
 * section. They are the reason the info button exists, so they name who ends up
 * with the money and what it buys — never a restatement of the arithmetic
 * already sitting in the rows above them.
 */
export const EARNINGS_BUNDLE: NestedCatalogue = {
  earnings: {
    statement: {
      clubAdminFormula: '{pool} × {pct}%',
      clubAdminLabel: 'Club Admin Fee @{pct}%',
      clubDescription:
        'The club admin’s share for running the club this pod belongs to — bringing members in, keeping the community active and backing you while you host. Duncit sets the rate per club, and it comes out of the pool before the venue and your side are split.',
      clubTitle: 'Club Charges',
      collectionLabel: 'Total collection',
      // The engine charges no commission when the host's remainder is not
      // positive, and the row says so rather than showing "× 0%".
      commissionFormula: '{host} × {pct}% (your remainder)',
      duncitCommissionLabel: 'Duncit Commission @{pct}%',
      // Written on the TOTAL COLLECTION — the one base printed on the panel —
      // rather than the derived taxable value. {divisor} is 100 + {pct}.
      gstFormula: '{amount} (total collection) × {pct} ÷ {divisor}',
      gstLabel: 'GST @{pct}%',
      includedGstNote: 'Includes GST {gst} — prices are GST-inclusive',
      noCommissionFormula: 'No commission — host remainder is not positive',
      platformDescription:
        'What it costs to put this pod on and pay you for it — payment-gateway charges, booking and ticketing, support, and the payout itself. The platform fee is charged on what is left after GST; the Duncit commission is charged only on your own remainder, so it never touches the venue’s or the club’s money.',
      platformFeeFormula: '{net} × {pct}%',
      platformFeeLabel: 'Platform Fee @{pct}%',
      platformTitle: 'Platform Charges',
      taxableFormula: '{amount} − {gst} GST (prices are GST-inclusive)',
      taxableLabel: 'Taxable Amount',
      taxesDescription:
        'GST is a government tax on every ticket sold, not a Duncit charge. Your ticket prices are GST-inclusive, so it is already sitting inside the total collection — Duncit takes it out and pays it to the government on the pod’s behalf.',
      taxesTitle: 'Taxes',
      // Duncit's cut of the VENUE's money is already inside the slot price, so
      // this row states it without deducting it a second time.
      venueCommissionFormula:
        '{venue} × {pct}% of the slot price above — the venue receives {receives}',
      venueCommissionLabel: 'Duncit Commission from Venue @{pct}%',
      venueDescription:
        'The fixed price the venue set for the slot you booked, from the Partners portal. It pays for the space itself and is deducted once for the whole pod, not per guest — so filling more spots never costs you more here. Duncit’s commission on the venue comes out of that same slot price, not out of your earnings.',
      venueSlotFormula: 'Fixed booked slot price (deducted once per pod)',
      venueSlotLabel: 'Venue Slot Price',
      venueTitle: 'Venue Charges',
      // Accessible name for the info control that reveals a *Description.
      whyThisCharge: 'Why this charge?',
    },
  },
};
