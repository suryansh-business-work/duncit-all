import { useFormContext, useWatch } from 'react-hook-form';
import { FreeArrangementFields } from '@duncit/forms';
import { isFreeVenueOfferModel } from '@duncit/utils';

import { useTranslation } from '../i18n/useTranslation';
import { isFreePodType } from '../pod-type';
import type { PodFormValues } from '../types';

const NAMES = { reason: 'free_reason', details: 'free_details', accepted: 'free_accepted' } as const;

export interface FreeJustificationFieldProps {
  /** Where "Free" was picked: the pod type (`pod`) or the venue's terms (`venue`). */
  place: 'pod' | 'venue';
}

/**
 * Why the pod or its venue is free, and Duncit's free policy accepted
 * (`FreeArrangementFields` from `@duncit/forms`) — ONE set of fields for both,
 * drawn where "Free" was picked: under the pod type for a FREE pod, under the
 * venue's terms for a free venue on a paid pod. A free pod's block already
 * covers its venue, so the venue's never draws a second one. Whether it must be
 * filled is the schema's (`refineFreeJustification`).
 */
export default function FreeJustificationField({ place }: Readonly<FreeJustificationFieldProps>) {
  const { t } = useTranslation();
  const { control } = useFormContext<PodFormValues>();
  const [podType, model] = useWatch({ control, name: ['pod_type', 'venue_offer_model'] });
  const freePod = isFreePodType(podType);
  const shown = place === 'pod' ? freePod : !freePod && isFreeVenueOfferModel(model);
  if (!shown) return null;
  return <FreeArrangementFields control={control} names={NAMES} t={t} idPrefix="pod-form" />;
}
