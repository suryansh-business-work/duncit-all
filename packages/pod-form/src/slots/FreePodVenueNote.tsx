import { Alert } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { freePodVenueNotice } from '@duncit/utils';

import { usePodFormData } from '../context';
import { useTranslation } from '../i18n/useTranslation';
import { isFreePodType, normalizePodType } from '../pod-type';
import type { PodFormValues } from '../types';
import { useVenueSlots } from './useVenueSlots';

/**
 * What a free pod means for a venue that charges for the picked slot.
 *
 * Duncit collects nothing on a free pod, so it pays the venue nothing — the
 * host settles the venue's charges with the venue directly, and the venue is
 * told the same with the request. Said here, under the slot picker, because
 * this is where the author commits to the slot. A ₹0 slot or the host's own
 * venue books instantly and shows nothing — the one rule mWeb and the app
 * read too (`freePodVenueNotice`); only the wording is this form's.
 *
 * The slot list is the picker's own query (same variables, one cache entry),
 * and is not asked for at all while the pod is paid.
 */
export default function FreePodVenueNote() {
  const { t } = useTranslation();
  const { ownVenueIds } = usePodFormData();
  const { control } = useFormContext<PodFormValues>();
  const podType = useWatch({ control, name: 'pod_type' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const slotId = useWatch({ control, name: 'venue_slot_id' });
  const { slots } = useVenueSlots(venueId, !isFreePodType(podType));

  const slotPrice = slots.find((slot) => slot.id === slotId)?.price;
  const ownVenue = (ownVenueIds ?? []).includes(venueId);
  const notice = freePodVenueNotice({ podType: normalizePodType(podType), slotPrice, ownVenue });
  if (notice === 'NONE') return null;

  return (
    <Alert severity="info" role="status" data-testid="free-pod-venue-note">
      {t('podForm.whenWhereSection.freePodVenueNote')}
    </Alert>
  );
}
