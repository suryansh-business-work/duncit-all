import { useFieldArray, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/app-settings';
import LayerList from './LayerList';
import { newParticle } from './new-layers';
import { LIMITS } from './occasion-theme.limits';
import type { OccasionThemeFormValues } from './occasion-theme.types';
import ParticleLayerFields from './ParticleLayerFields';
import { useSeedColor } from './useSeedColor';

/** Up to four swarms of marks — snow, petals, sparks, bats, confetti. */
export default function ParticlesSection({ control }: Readonly<{ control: Control<OccasionThemeFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'particles' });
  const seed = useSeedColor(control);

  return (
    <LayerList
      title={t('marketing.occasions.particles.title')}
      subtitle={t('marketing.occasions.particles.subtitle', { vars: { max: LIMITS.particleLayers } })}
      addLabel={t('marketing.occasions.particles.add')}
      noneText={t('marketing.occasions.particles.none')}
      max={LIMITS.particleLayers}
      ids={fields.map((field) => field.id)}
      itemTitle={(n) => t('marketing.occasions.particles.layerN', { vars: { n } })}
      removeLabel={(n) => t('marketing.occasions.particles.removeN', { vars: { n } })}
      onAdd={() => append(newParticle(seed))}
      onRemove={remove}
      renderItem={(index) => <ParticleLayerFields control={control} index={index} seed={seed} />}
    />
  );
}
