import { useWatch, type Control } from 'react-hook-form';
import { Collapse, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import ColorListField from './ColorListField';
import { GARLAND_LABEL, GARLAND_STYLES } from './form-copy';
import type { OccasionThemeFormValues } from './occasion-theme.types';
import { useSeedColor } from './useSeedColor';

/** The decoration hung along the top edge — string lights, bunting, a marigold toran, webs, icicles. */
export default function GarlandSection({ control }: Readonly<{ control: Control<OccasionThemeFormValues> }>) {
  const { t } = useTranslation();
  const style = useWatch({ control, name: 'garland.style' });
  const seed = useSeedColor(control);

  return (
    <SectionCard title={t('marketing.occasions.garland.title')} subtitle={t('marketing.occasions.garland.subtitle')}>
      <Stack spacing={2}>
        <RhfTextField
          control={control}
          name="garland.style"
          select
          size="small"
          label={t('marketing.occasions.garland.style')}
          sx={{ maxWidth: (th) => th.spacing(45) }}
        >
          {GARLAND_STYLES.map((option) => (
            <MenuItem key={option} value={option}>
              {t(GARLAND_LABEL[option])}
            </MenuItem>
          ))}
        </RhfTextField>
        <Collapse in={style !== 'NONE'} unmountOnExit>
          <ColorListField
            control={control}
            name="garland.colors"
            label={t('marketing.occasions.garland.colors')}
            hint={t('marketing.occasions.garland.colorsHint')}
            seed={seed}
          />
        </Collapse>
      </Stack>
    </SectionCard>
  );
}
