import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { DEFAULT_INPUTS, type PodProfitInputs } from './types';

/**
 * Finance > Default Deductions — the one place every rate in the waterfall is
 * set, and therefore the only place a fresh calculation may take its rates
 * from.
 *
 * A calculator that carries its own copy of those percentages is a second
 * source of truth that drifts the day someone edits the settings page (rule
 * 34): the club-admin cut sat at a literal 0 here long after the deduction
 * existed. DEFAULT_INPUTS keeps only the shape and the non-rate seeds (ticket
 * price, spots, venue price), which are a starting example rather than a
 * configured figure.
 */
export const POD_CALCULATOR_DEFAULTS = gql`
  query PodCalculatorDefaults {
    financeSettings {
      gst_pct
      platform_fee_pct
      default_host_commission_pct
      default_venue_commission_pct
      default_club_admin_pct
    }
  }
`;

/** A configured rate, or the shipped seed when the settings doc has no number
 * for it — a missing setting must never silently read as 0%. */
const pctOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export interface CalculatorDefaults {
  /** What a brand-new calculation starts on. */
  inputs: PodProfitInputs;
  /** True until the deductions are known, so nothing seeds from a guess. */
  loading: boolean;
}

export function useCalculatorDefaults(): CalculatorDefaults {
  const { data, loading } = useQuery<any>(POD_CALCULATOR_DEFAULTS, { fetchPolicy: 'cache-first' });
  const settings = data?.financeSettings;

  const inputs = useMemo<PodProfitInputs>(
    () => ({
      ...DEFAULT_INPUTS,
      gst_percent: pctOr(settings?.gst_pct, DEFAULT_INPUTS.gst_percent),
      platform_fee_percent: pctOr(settings?.platform_fee_pct, DEFAULT_INPUTS.platform_fee_percent),
      host_commission_percent: pctOr(
        settings?.default_host_commission_pct,
        DEFAULT_INPUTS.host_commission_percent
      ),
      venue_commission_percent: pctOr(
        settings?.default_venue_commission_pct,
        DEFAULT_INPUTS.venue_commission_percent
      ),
      club_admin_percent: pctOr(
        settings?.default_club_admin_pct,
        DEFAULT_INPUTS.club_admin_percent
      ),
    }),
    [settings]
  );

  return { inputs, loading: loading && !data };
}
