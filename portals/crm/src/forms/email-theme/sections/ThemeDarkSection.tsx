import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { THEME_FIELD_COPY } from '../themeFieldCopy';
import { DARK_COLOR_FIELDS } from '../email-theme.schema';
import ColorField from './ColorField';

/** Light only, or follow the reader's mail app — and, when following it, the dark palette. */
export default function ThemeDarkSection() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const mode = useWatch({ control, name: 'color_mode' });
  return (
    <Stack spacing={1.5}>
      <Controller
        name="color_mode"
        control={control}
        render={({ field }) => (
          <RadioGroup {...field} aria-label={t('crm.emailSettings.colorMode')}>
            <FormControlLabel value="AUTO" control={<Radio size="small" />} label={t('crm.emailSettings.modeAuto')} />
            <FormControlLabel value="LIGHT" control={<Radio size="small" />} label={t('crm.emailSettings.modeLight')} />
          </RadioGroup>
        )}
      />
      {mode === 'AUTO' ? (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
          {DARK_COLOR_FIELDS.map((field) => (
            <ColorField key={field} name={field} label={t(THEME_FIELD_COPY[field].labelKey)} />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.emailSettings.lightOnlyNote')}
        </Typography>
      )}
    </Stack>
  );
}
