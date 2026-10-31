import type { Control } from 'react-hook-form';
import { Grid, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { COLOR_MODES, COLOR_MODE_LABEL, REGIONS, REGION_LABEL } from '../copy';
import { LIMITS } from './occasion-theme.limits';
import type { OccasionThemeFormValues } from './occasion-theme.types';

/** What the look is called, where it sits in the catalogue, its greeting and its colour mode. */
export default function BasicsSection({ control }: Readonly<{ control: Control<OccasionThemeFormValues> }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('marketing.occasions.editor.basicsTitle')} subtitle={t('marketing.occasions.editor.basicsSubtitle')}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 7 }}>
          <RhfTextField
            control={control}
            name="name"
            label={t('marketing.occasions.form.name')}
            hint={t('marketing.occasions.form.nameHint', { vars: { max: LIMITS.name } })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <RhfTextField control={control} name="region" select label={t('marketing.occasions.form.region')} hint={t('marketing.occasions.form.regionHint')}>
            {REGIONS.map((region) => (
              <MenuItem key={region} value={region}>
                {t(REGION_LABEL[region])}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="description"
            label={t('marketing.occasions.form.description')}
            hint={t('marketing.occasions.form.descriptionHint', { vars: { max: LIMITS.description } })}
            multiline
            minRows={2}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 7 }}>
          <RhfTextField
            control={control}
            name="greeting"
            label={t('marketing.occasions.form.greeting')}
            hint={t('marketing.occasions.form.greetingHint', { vars: { max: LIMITS.greeting } })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <RhfTextField
            control={control}
            name="color_mode"
            select
            label={t('marketing.occasions.form.colorMode')}
            hint={t('marketing.occasions.form.colorModeHint')}
          >
            {COLOR_MODES.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {t(COLOR_MODE_LABEL[mode])}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
      </Grid>
    </SectionCard>
  );
}
