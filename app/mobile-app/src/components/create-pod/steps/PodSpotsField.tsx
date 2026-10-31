import { Controller } from 'react-hook-form';
import type { SpotsBounds } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { SpotsStepper } from '../SpotsStepper';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  /** The range the host may size this pod within (sub-category min → venue capacity). */
  spots: SpotsBounds;
}

/** How many people the pod takes, for a pod whose guests are not picked with a
 * venue offer — a virtual pod, or a Pod Request's that keeps the slot it holds.
 * mWeb twin: steps/PodSpotsField. */
export function PodSpotsField({ form, spots }: Readonly<Props>) {
  const { t } = useTranslation();
  const isPhysical = form.watch('pod_mode') === 'PHYSICAL';
  const boundsHint = spots.slidable
    ? t('mweb.createPod.spotsBoundsHint', { vars: { min: spots.min, max: spots.max } })
    : undefined;
  return (
    <SurfaceCard testID="create-pod-spots-card">
      <Controller
        control={form.control}
        name="no_of_spots_text"
        render={({ field, fieldState }) => (
          <SpotsStepper
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            min={spots.min}
            max={spots.max}
            slidable={spots.slidable}
            boundsHint={boundsHint}
            // Fixed when the venue leaves no room to choose.
            readOnly={isPhysical && !spots.slidable}
          />
        )}
      />
    </SurfaceCard>
  );
}
