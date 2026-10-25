import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { SpotsStepper } from '@duncit/ui';
import { spotsBounds, spotsSnapTarget } from '@duncit/utils';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { useAskTranslation } from './ask-translation';
import type { PodResubmitValues } from './pod-resubmit.form';
import type { ResubmitVenueTerms } from './useResubmitVenueTerms';

interface Props {
  form: UseFormReturn<PodResubmitValues, unknown, PodResubmitValues>;
  /** The picked venue's bounds on an offer. */
  terms: ResubmitVenueTerms;
}

/**
 * The pod's spots — which ARE the new offer's guests — held from the venue's
 * minimum up to what the offered space holds. The server refuses an offer
 * below the minimum (BELOW_VENUE_MINIMUM) or above the space, so a count
 * outside them snaps in as soon as the venue is known, on the SAME stepper
 * Create Pod and Edit Pod draw (rule 40).
 */
export default function ResubmitSpotsField({ form, terms }: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const { t } = useAskTranslation();
  const bounds = spotsBounds({ venueCapacity: terms.capacity, venueMinPax: terms.minGuests });
  const pax = Number(form.watch('pax')) || 0;

  useEffect(() => {
    // An unknown count is left for the host; one outside the venue's range moves in.
    const next = spotsSnapTarget(Number(form.getValues('pax')) || 0, bounds);
    if (next !== null) form.setValue('pax', next, { shouldDirty: true });
    // The bounds object is rebuilt every render; its two ends are what move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, bounds.min, bounds.max]);

  return (
    <SpotsStepper
      labels={labels.spots}
      value={pax}
      onChange={(next) => form.setValue('pax', next, { shouldDirty: true })}
      min={bounds.min}
      max={bounds.max}
      slidable={bounds.slidable}
      boundsHint={terms.minGuests > 0 ? t('availability.offers.ask.venueMinimum', { vars: { min: terms.minGuests } }) : undefined}
      // Only fixed when the venue leaves no room to choose.
      readOnly={bounds.max <= bounds.min}
    />
  );
}
