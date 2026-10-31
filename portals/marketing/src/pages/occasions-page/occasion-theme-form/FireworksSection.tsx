import { useWatch, type Control } from 'react-hook-form';
import { Collapse, Grid, Stack } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { RhfOnOff } from '../rhf-fields';
import ColorListField from './ColorListField';
import { RANGES } from './occasion-theme.limits';
import type { OccasionThemeFormValues } from './occasion-theme.types';
import SliderField from './SliderField';
import { useSeedColor } from './useSeedColor';

/** Bursts of glowing sparks in the upper half of the screen: on or off, their colours, how often and how big. */
export default function FireworksSection({ control }: Readonly<{ control: Control<OccasionThemeFormValues> }>) {
  const { t } = useTranslation();
  const enabled = useWatch({ control, name: 'fireworks.enabled' });
  const seed = useSeedColor(control);

  return (
    <SectionCard title={t('marketing.occasions.fireworks.title')} subtitle={t('marketing.occasions.fireworks.subtitle')}>
      <Stack spacing={2}>
        <RhfOnOff control={control} name="fireworks.enabled" label={t('marketing.occasions.fireworks.enabled')} />
        <Collapse in={enabled} unmountOnExit>
          <Stack spacing={2}>
            <ColorListField control={control} name="fireworks.colors" label={t('marketing.occasions.fireworks.colors')} seed={seed} />
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SliderField
                  control={control}
                  name="fireworks.bursts_per_minute"
                  label={t('marketing.occasions.fireworks.bursts')}
                  range={RANGES.bursts}
                  unit="perMinute"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SliderField control={control} name="fireworks.sparks" label={t('marketing.occasions.fireworks.sparks')} range={RANGES.sparks} unit="count" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SliderField control={control} name="fireworks.radius" label={t('marketing.occasions.fireworks.radius')} range={RANGES.radius} unit="px" />
              </Grid>
            </Grid>
          </Stack>
        </Collapse>
      </Stack>
    </SectionCard>
  );
}
