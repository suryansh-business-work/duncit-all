import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Stack from '@mui/material/Stack';
import { useTranslation } from '@duncit/app-settings';
import {
  DEFAULT_VENUE_COMMISSION,
  SET_VENUE_CANCELLATION_TRIGGER,
  SET_VENUE_DEDUCTIONS,
  SET_VENUE_HOST_REQUEST_LIMIT,
} from './queries';
import { CancellationTriggerForm, type VenueCancellationTrigger } from './cancellation-trigger';
import VenueDeductionsPanel from './VenueDeductionsPanel';
import { RequestLimitForm } from '../../components/request-limit';

/** The venue fields these panels read and write back. */
export interface SettingsPanelsVenue {
  id: string;
  venue_share_pct?: number | null;
  venue_commission_pct?: number | null;
  host_requests_limit_override?: number | null;
  settings?: { cancellation?: Partial<VenueCancellationTrigger> | null } | null;
}

export interface VenueSettingsPanelsProps {
  /** The venue row the dialog is open on. */
  venue: SettingsPanelsVenue | null;
  /** Refresh the table behind the dialog once a panel has saved. */
  onSaved: () => void;
}

/**
 * The two settlement panels an onboarded venue carries: what Duncit deducts
 * from its payout, and the auto-cancel trigger + refund ladder that decides
 * what a loss-making pod here costs. They are one unit because they answer the
 * same question from opposite ends, and both the Edit and the Review dialog
 * mount them — so the wiring lives here once rather than in each dialog's
 * parent (CLAUDE.md rule 34). The admin-only "Maximum Host Requests / Month"
 * (partners never see or change it; empty = the default of 10) sits beside the
 * deductions for the same reason.
 *
 * Each panel saves on its own button through its own mutation, independently of
 * the Edit dialog's Save.
 */
export default function VenueSettingsPanels({ venue, onSaved }: Readonly<VenueSettingsPanelsProps>) {
  const { t } = useTranslation();
  // What the server has kept, as the panels re-seed from it. Saved values are
  // merged in rather than refetched into: the panels read their fields back off
  // this object, so it has to be what they see next.
  const [saved, setSaved] = useState<SettingsPanelsVenue | null>(venue);
  const [setVenueDeductions, deductionsState] = useMutation(SET_VENUE_DEDUCTIONS);
  const [setCancellationTrigger, triggerState] = useMutation(SET_VENUE_CANCELLATION_TRIGGER);
  const [setHostRequestLimit, limitState] = useMutation(SET_VENUE_HOST_REQUEST_LIMIT);
  const { data: defaultsData } = useQuery<{ defaultVenueCommissionPct?: number | null }>(
    DEFAULT_VENUE_COMMISSION,
    { fetchPolicy: 'cache-first' }
  );

  // Only fires when the dialog is opened on a different venue — a save merges
  // into `saved` and never changes the prop.
  useEffect(() => {
    setSaved(venue);
  }, [venue]);

  // The panels only render with a venue open, so each save has one to act on.
  const saveDeductions = async (sharePct: number, commissionPct: number) => {
    if (!venue) return;
    await setVenueDeductions({
      variables: { id: venue.id, venue_share_pct: sharePct, venue_commission_pct: commissionPct },
    });
    setSaved((current) =>
      current
        ? { ...current, venue_share_pct: sharePct, venue_commission_pct: commissionPct }
        : current
    );
    onSaved();
  };

  const saveCancellationTrigger = async (trigger: VenueCancellationTrigger) => {
    if (!venue) return;
    await setCancellationTrigger({ variables: { id: venue.id, ...trigger } });
    setSaved((current) =>
      current
        ? {
            ...current,
            settings: {
              ...current.settings,
              cancellation: { ...current.settings?.cancellation, ...trigger },
            },
          }
        : current
    );
    onSaved();
  };

  const saveRequestLimit = async (limit: number | null) => {
    if (!venue) return;
    await setHostRequestLimit({ variables: { id: venue.id, limit } });
    setSaved((current) => (current ? { ...current, host_requests_limit_override: limit } : current));
    onSaved();
  };

  if (!venue) return null;

  return (
    <Stack spacing={2}>
      <VenueDeductionsPanel
        active={saved}
        onSaveDeductions={saveDeductions}
        saving={deductionsState.loading}
        defaultCommissionPct={defaultsData?.defaultVenueCommissionPct ?? undefined}
      />
      <RequestLimitForm
        label={t('podRequests.venueLimitLabel')}
        limit={saved?.host_requests_limit_override}
        saving={limitState.loading}
        onSave={saveRequestLimit}
        testId="venue-request-limit"
      />
      <CancellationTriggerForm
        trigger={saved?.settings?.cancellation}
        saving={triggerState.loading}
        onSubmit={saveCancellationTrigger}
      />
    </Stack>
  );
}
