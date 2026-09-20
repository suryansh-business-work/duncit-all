import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Stack from '@mui/material/Stack';
import {
  DEFAULT_VENUE_COMMISSION,
  SET_VENUE_CANCELLATION_TRIGGER,
  SET_VENUE_DEDUCTIONS,
} from './queries';
import { CancellationTriggerForm, type VenueCancellationTrigger } from './cancellation-trigger';
import VenueDeductionsPanel from './VenueDeductionsPanel';

export interface VenueSettingsPanelsProps {
  /** The venue row the dialog is open on. */
  venue: any;
  /** Refresh the table behind the dialog once a panel has saved. */
  onSaved: () => void;
}

/**
 * The two settlement panels an onboarded venue carries: what Duncit deducts
 * from its payout, and the auto-cancel trigger + refund ladder that decides
 * what a loss-making pod here costs. They are one unit because they answer the
 * same question from opposite ends, and both the Edit and the Review dialog
 * mount them — so the wiring lives here once rather than in each dialog's
 * parent (CLAUDE.md rule 34).
 *
 * Each panel saves on its own button through its own mutation, independently of
 * the Edit dialog's Save.
 */
export default function VenueSettingsPanels({ venue, onSaved }: Readonly<VenueSettingsPanelsProps>) {
  // What the server has kept, as the panels re-seed from it. Saved values are
  // merged in rather than refetched into: the panels read their fields back off
  // this object, so it has to be what they see next.
  const [saved, setSaved] = useState<any>(venue);
  const [setVenueDeductions, deductionsState] = useMutation<any>(SET_VENUE_DEDUCTIONS);
  const [setCancellationTrigger, triggerState] = useMutation<any>(SET_VENUE_CANCELLATION_TRIGGER);
  const { data: defaultsData } = useQuery<any>(DEFAULT_VENUE_COMMISSION, {
    fetchPolicy: 'cache-first',
  });

  // Only fires when the dialog is opened on a different venue — a save merges
  // into `saved` and never changes the prop.
  useEffect(() => {
    setSaved(venue);
  }, [venue]);

  const saveDeductions = async (sharePct: number, commissionPct: number) => {
    await setVenueDeductions({
      variables: { id: venue.id, venue_share_pct: sharePct, venue_commission_pct: commissionPct },
    });
    setSaved((current: any) =>
      current
        ? { ...current, venue_share_pct: sharePct, venue_commission_pct: commissionPct }
        : current
    );
    onSaved();
  };

  const saveCancellationTrigger = async (trigger: VenueCancellationTrigger) => {
    await setCancellationTrigger({ variables: { id: venue.id, ...trigger } });
    setSaved((current: any) =>
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

  if (!venue) return null;

  return (
    <Stack spacing={2}>
      <VenueDeductionsPanel
        active={saved}
        onSaveDeductions={saveDeductions}
        saving={deductionsState.loading}
        defaultCommissionPct={defaultsData?.defaultVenueCommissionPct}
      />
      <CancellationTriggerForm
        trigger={saved?.settings?.cancellation}
        saving={triggerState.loading}
        onSubmit={saveCancellationTrigger}
      />
    </Stack>
  );
}
