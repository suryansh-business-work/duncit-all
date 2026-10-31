import { useFieldArray, type Control } from 'react-hook-form';
import { Grid, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import ColorField from './ColorField';
import { OVERLAY_LABEL, OVERLAY_STYLES } from './form-copy';
import LayerList from './LayerList';
import { newOverlay } from './new-layers';
import { LIMITS, RANGES } from './occasion-theme.limits';
import type { OccasionThemeFormValues } from './occasion-theme.types';
import SliderField from './SliderField';
import { useSeedColor } from './useSeedColor';

type Props = Readonly<{ control: Control<OccasionThemeFormValues> }>;

/** One wash: its kind, its colour and how strong it is at its strongest. */
function OverlayFields({ control, index }: Props & Readonly<{ index: number }>) {
  const { t } = useTranslation();
  const at = `overlays.${index}` as const;
  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RhfTextField control={control} name={`${at}.style`} select size="small" label={t('marketing.occasions.atmosphere.style')}>
          {OVERLAY_STYLES.map((style) => (
            <MenuItem key={style} value={style}>
              {t(OVERLAY_LABEL[style])}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ColorField control={control} name={`${at}.color`} label={t('marketing.occasions.atmosphere.color')} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SliderField
          control={control}
          name={`${at}.opacity`}
          label={t('marketing.occasions.atmosphere.strength')}
          range={RANGES.overlayOpacity}
          unit="percent"
        />
      </Grid>
    </Grid>
  );
}

/** Up to three washes over the whole screen, painted in order: a warm glow, a dark vignette, drifting fog. */
export default function AtmosphereSection({ control }: Props) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'overlays' });
  const seed = useSeedColor(control);

  return (
    <LayerList
      title={t('marketing.occasions.atmosphere.title')}
      subtitle={t('marketing.occasions.atmosphere.subtitle', { vars: { max: LIMITS.overlays } })}
      addLabel={t('marketing.occasions.atmosphere.add')}
      noneText={t('marketing.occasions.atmosphere.none')}
      max={LIMITS.overlays}
      ids={fields.map((field) => field.id)}
      itemTitle={(n) => t('marketing.occasions.atmosphere.washN', { vars: { n } })}
      removeLabel={(n) => t('marketing.occasions.atmosphere.removeN', { vars: { n } })}
      onAdd={() => append(newOverlay(seed))}
      onRemove={remove}
      renderItem={(index) => <OverlayFields control={control} index={index} />}
    />
  );
}
