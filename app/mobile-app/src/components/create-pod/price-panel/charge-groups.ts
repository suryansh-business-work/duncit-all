import type { PotentialEarnings } from '@/hooks/usePotentialEarnings';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ChargeLine {
  label: string;
  value: number;
}

export interface ChargeGroups {
  gstLines: ChargeLine[];
  venueLines: ChargeLine[];
  gstTotal: number;
  venueTotal: number;
  totalDeductions: number;
}

/** The two nested charge groups + their totals, grouped exactly as settled:
 * platform-side lines vs the venue-side lines. Without a venue the Duncit
 * commission joins the platform group (there is no venue group to carry it).
 * mWeb twin of buildChargeGroups. */
export function buildChargeGroups(w: PotentialEarnings, hasVenue: boolean): ChargeGroups {
  const gstLines: ChargeLine[] = [
    { label: `GST (${w.gst_pct}%)`, value: w.gst_amount },
    { label: `Platform Fee (${w.platform_fee_pct}%)`, value: w.platform_fee_amount },
  ];
  if (w.club_admin_amount > 0) {
    gstLines.push({ label: `Club Admin (${w.club_admin_pct}%)`, value: w.club_admin_amount });
  }
  if (!hasVenue) {
    gstLines.push({
      label: `Duncit Commission (${w.host_commission_pct}%)`,
      value: w.host_commission_amount,
    });
  }
  const venueLines: ChargeLine[] = hasVenue
    ? [
        { label: 'Venue slot price', value: w.venue_amount },
        {
          label: `Duncit Commission from Venue (${w.host_commission_pct}%)`,
          value: w.host_commission_amount,
        },
      ]
    : [];
  const sum = (lines: ChargeLine[]) => round2(lines.reduce((total, line) => total + line.value, 0));
  return {
    gstLines,
    venueLines,
    gstTotal: sum(gstLines),
    venueTotal: sum(venueLines),
    totalDeductions: round2(w.amount - w.host_receives),
  };
}
