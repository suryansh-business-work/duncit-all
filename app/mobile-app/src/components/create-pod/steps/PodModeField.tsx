import { Controller } from 'react-hook-form';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipSelectField } from '../ChipSelectField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  /** Club Admin mode: the pod's club is fixed, so a mode switch keeps it. */
  pinnedClub: boolean;
}

/** Physical or virtual — decides whether Where & when asks for a venue or a
 * meeting. mWeb twin: steps/PodModeField. */
export function PodModeField({ form, pinnedClub }: Readonly<Props>) {
  const { control, setValue } = form;
  const { t } = useTranslation();
  const modes = [
    { value: 'PHYSICAL', label: t('mweb.createPod.modePhysical') },
    { value: 'VIRTUAL', label: t('mweb.createPod.modeVirtual') },
  ];
  return (
    <SurfaceCard>
      <Controller
        control={control}
        name="pod_mode"
        render={({ field }) => (
          <ChipSelectField
            label={t('mweb.createPod.podMode')}
            options={modes}
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              // The club list depends on the mode, so the old pick may not be in it.
              if (!pinnedClub) setValue('club_id', '', { shouldDirty: true });
              // The Free/Paid pick survives the switch: a physical pod may be
              // free too, so the mode no longer forces the type.
            }}
            testID="create-pod-mode"
          />
        )}
      />
    </SurfaceCard>
  );
}
