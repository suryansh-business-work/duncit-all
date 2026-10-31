import type { Control } from 'react-hook-form';
import { Grid, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { tokens } from '@duncit/theme';
import { useTranslation } from '@duncit/app-settings';
import ColorListField from './ColorListField';
import { MOTIONS, MOTION_LABEL } from './form-copy';
import { LIMITS, RANGES } from './occasion-theme.limits';
import type { OccasionThemeFormValues } from './occasion-theme.types';
import ShapePicker from './ShapePicker';
import SliderField from './SliderField';

interface Props {
  control: Control<OccasionThemeFormValues>;
  index: number;
  seed: string;
}

/** One swarm of marks: which marks, in which colours, how they move, how many and how big. */
export default function ParticleLayerFields({ control, index, seed }: Readonly<Props>) {
  const { t } = useTranslation();
  const at = `particles.${index}` as const;

  return (
    <Stack spacing={2}>
      <ShapePicker control={control} name={`${at}.shapes`} label={t('marketing.occasions.particles.shapes')} />
      <ColorListField control={control} name={`${at}.colors`} label={t('marketing.occasions.particles.colors')} seed={seed} />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfTextField control={control} name={`${at}.motion`} select size="small" label={t('marketing.occasions.particles.motion')}>
            {MOTIONS.map((motion) => (
              <MenuItem key={motion} value={motion}>
                {t(MOTION_LABEL[motion])}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField
            control={control}
            name={`${at}.count`}
            label={t('marketing.occasions.particles.count')}
            hint={t('marketing.occasions.particles.countHint')}
            range={RANGES.count}
            unit="count"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField control={control} name={`${at}.size`} label={t('marketing.occasions.particles.size')} range={RANGES.size} unit="px" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField
            control={control}
            name={`${at}.speed`}
            label={t('marketing.occasions.particles.speed')}
            hint={t('marketing.occasions.particles.speedHint')}
            range={RANGES.speed}
            unit="count"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SliderField control={control} name={`${at}.opacity`} label={t('marketing.occasions.particles.opacity')} range={RANGES.opacity} unit="percent" />
        </Grid>
      </Grid>
      <RhfTextField
        control={control}
        name={`${at}.custom_paths`}
        label={t('marketing.occasions.particles.customPaths')}
        hint={t('marketing.occasions.particles.customPathsHint', { vars: { max: LIMITS.customPaths } })}
        multiline
        minRows={2}
        size="small"
        slotProps={{ htmlInput: { spellCheck: false } }}
        sx={{ '& textarea': { fontFamily: tokens.font.mono } }}
      />
    </Stack>
  );
}
