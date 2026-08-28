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
 * language has to be able to check the arithmetic the same way.
 */
export const EARNINGS_BUNDLE: NestedCatalogue = {
  earnings: {
    statement: {
      clubAdminFormula: '{pool} × {pct}%',
      clubAdminLabel: 'Club Admin Fee @{pct}%',
      clubTitle: 'Club Charges',
      collectionLabel: 'Total collection',
      // The engine charges no commission when the host's remainder is not
      // positive, and the row says so rather than showing "× 0%".
      commissionFormula: '{host} × {pct}% (your remainder)',
      duncitCommissionLabel: 'Duncit Commission @{pct}%',
      gstFormula: '{net} × {pct}%',
      gstLabel: 'GST @{pct}%',
      includedGstNote: 'Includes GST {gst} — prices are GST-inclusive',
      noCommissionFormula: 'No commission — host remainder is not positive',
      platformFeeFormula: '{net} × {pct}%',
      platformFeeLabel: 'Platform Fee @{pct}%',
      platformTitle: 'Platform Charges',
      taxableFormula: '{amount} − {gst} GST (prices are GST-inclusive)',
      taxableLabel: 'Taxable Amount',
      taxesTitle: 'Taxes',
      // Duncit's cut of the VENUE's money is already inside the slot price, so
      // this row states it without deducting it a second time.
      venueCommissionFormula:
        '{venue} × {pct}% of the slot price above — the venue receives {receives}',
      venueCommissionLabel: 'Duncit Commission from Venue @{pct}%',
      venueSlotFormula: 'Fixed booked slot price (deducted once per pod)',
      venueSlotLabel: 'Venue Slot Price',
      venueTitle: 'Venue Charges',
    },
  },
};
