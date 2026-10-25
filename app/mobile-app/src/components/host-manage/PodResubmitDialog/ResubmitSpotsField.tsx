import { useEffect } from 'react';
import { spotsBounds, spotsSnapTarget } from '@duncit/utils';

import { SpotsStepper } from '@/components/create-pod/SpotsStepper';
import { useTranslation } from '@/hooks/useTranslation';
import type { ResubmitForm } from '../pod-resubmit.form';
import type { ResubmitVenueTerms } from './useResubmitVenueTerms';

interface Props {
  form: ResubmitForm;
  /** The picked venue's bounds on an offer. */
  terms: ResubmitVenueTerms;
}

/**
 * The pod's spots — which ARE the new offer's guests — held from the venue's
 * minimum up to what the offered space holds. The server refuses an offer
 * below the minimum (BELOW_VENUE_MINIMUM) or above the space, so a count
 * outside them snaps in as soon as the venue is known, on the SAME stepper
 * Create Pod draws. mWeb twin: ResubmitSpotsField.
 */
export function ResubmitSpotsField({ form, terms }: Readonly<Props>) {
  const { t } = useTranslation();
  const bounds = spotsBounds({ venueCapacity: terms.capacity, venueMinPax: terms.minGuests });
  const pax = form.watch('pax');

  useEffect(() => {
    // An unknown count is left for the host; one outside the venue's range moves in.
    const next = spotsSnapTarget(form.getValues('pax'), bounds);
    if (next !== null) form.setValue('pax', next, { shouldDirty: true });
    // The bounds object is rebuilt every render; its two ends are what move.
  }, [form, bounds.min, bounds.max]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SpotsStepper
      value={String(pax)}
      onChange={(next) => form.setValue('pax', Number(next) || 0, { shouldDirty: true })}
      min={bounds.min}
      max={bounds.max}
      slidable={bounds.slidable}
      boundsHint={
        terms.minGuests > 0
          ? t('availability.offers.ask.venueMinimum', { vars: { min: terms.minGuests } })
          : undefined
      }
      // Only fixed when the venue leaves no room to choose.
      readOnly={bounds.max <= bounds.min}
    />
  );
}
