import { useFieldArray, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/app-settings';
import FlyerFields from './FlyerFields';
import LayerList from './LayerList';
import { newFlyer } from './new-layers';
import { LIMITS } from './occasion-theme.limits';
import type { OccasionThemeFormValues } from './occasion-theme.types';

/** Up to three pictures that cross the screen now and then — Santa's sleigh, a witch, a kite. */
export default function FlyersSection({ control }: Readonly<{ control: Control<OccasionThemeFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'flyers' });

  return (
    <LayerList
      title={t('marketing.occasions.flyers.title')}
      subtitle={t('marketing.occasions.flyers.subtitle', { vars: { max: LIMITS.flyers } })}
      addLabel={t('marketing.occasions.flyers.add')}
      noneText={t('marketing.occasions.flyers.none')}
      max={LIMITS.flyers}
      ids={fields.map((field) => field.id)}
      itemTitle={(n) => t('marketing.occasions.flyers.flyerN', { vars: { n } })}
      removeLabel={(n) => t('marketing.occasions.flyers.removeN', { vars: { n } })}
      onAdd={() => append(newFlyer())}
      onRemove={remove}
      renderItem={(index) => <FlyerFields control={control} index={index} />}
    />
  );
}
