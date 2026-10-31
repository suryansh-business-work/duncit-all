import { useWatch, type Control } from 'react-hook-form';
import { Alert, Grid, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { OCCASION_ARTWORK_NAMES } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { RhfImage } from '../rhf-fields';
import ArtworkThumb from './ArtworkThumb';
import ColorField from './ColorField';
import { ARTWORK_LABEL, DIRECTIONS, DIRECTION_LABEL } from './form-copy';
import { RANGES } from './occasion-theme.limits';
import type { OccasionThemeFormValues } from './occasion-theme.types';
import SliderField from './SliderField';

interface Props {
  control: Control<OccasionThemeFormValues>;
  index: number;
}

/** Where uploaded flyer images are kept in the media library. */
const IMAGE_FOLDER = '/occasions/flyers';

/** One flyer: what crosses, which way, how high, how big, how often, and the dust behind it. */
export default function FlyerFields({ control, index }: Readonly<Props>) {
  const { t } = useTranslation();
  const at = `flyers.${index}` as const;
  const artwork = useWatch({ control, name: `${at}.artwork` });
  const layers = useWatch({ control, name: `${at}.custom_layers` });
  // CUSTOM is an agent-made drawing; it is offered only to the flyer that already has one.
  const options = [...OCCASION_ARTWORK_NAMES, 'IMAGE' as const, ...(layers.length > 0 ? ['CUSTOM' as const] : [])];

  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name={`${at}.artwork`}
        select
        size="small"
        label={t('marketing.occasions.flyers.artwork')}
      >
        {options.map((name) => (
          <MenuItem key={name} value={name} sx={{ gap: 1.5 }}>
            <ArtworkThumb artwork={name} layers={layers} />
            {t(ARTWORK_LABEL[name])}
          </MenuItem>
        ))}
      </RhfTextField>
      {artwork === 'IMAGE' && (
        <RhfImage
          control={control}
          name={`${at}.image_url`}
          label={t('marketing.occasions.flyers.image')}
          hint={t('marketing.occasions.flyers.imageHint')}
          folder={IMAGE_FOLDER}
        />
      )}
      {artwork === 'CUSTOM' && <Alert severity="info">{t('marketing.occasions.flyers.customHint')}</Alert>}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfTextField control={control} name={`${at}.direction`} select size="small" label={t('marketing.occasions.flyers.direction')}>
            {DIRECTIONS.map((direction) => (
              <MenuItem key={direction} value={direction}>
                {t(DIRECTION_LABEL[direction])}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ColorField
            control={control}
            name={`${at}.trail_color`}
            label={t('marketing.occasions.flyers.trail')}
            hint={t('marketing.occasions.flyers.trailHint')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField
            control={control}
            name={`${at}.altitude`}
            label={t('marketing.occasions.flyers.altitude')}
            hint={t('marketing.occasions.flyers.altitudeHint')}
            range={RANGES.altitude}
            unit="screenPercent"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField control={control} name={`${at}.size`} label={t('marketing.occasions.flyers.size')} range={RANGES.flyerSize} unit="px" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField
            control={control}
            name={`${at}.duration`}
            label={t('marketing.occasions.flyers.duration')}
            hint={t('marketing.occasions.flyers.durationHint')}
            range={RANGES.duration}
            unit="s"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField
            control={control}
            name={`${at}.interval`}
            label={t('marketing.occasions.flyers.interval')}
            hint={t('marketing.occasions.flyers.intervalHint')}
            range={RANGES.interval}
            unit="s"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField control={control} name={`${at}.bob`} label={t('marketing.occasions.flyers.bob')} range={RANGES.bob} unit="px" />
        </Grid>
      </Grid>
    </Stack>
  );
}
