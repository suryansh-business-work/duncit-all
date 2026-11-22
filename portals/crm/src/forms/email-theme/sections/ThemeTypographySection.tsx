import { Controller, useFormContext } from 'react-hook-form';
import { Box, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { THEME_FIELD_COPY } from '../themeFieldCopy';
import type { CrmEmailFontOption } from '../../../api/emailSettings.gql';
import { EMAIL_THEME_RANGES } from '../email-theme.schema';
import SliderField from './SliderField';

interface Props {
  fonts: CrmEmailFontOption[];
}

/** Heading and body fonts (each shown in its own face) and the body text size. */
export default function ThemeTypographySection({ fonts }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
        {(['heading_font', 'body_font'] as const).map((name) => (
          <Controller
            key={name}
            name={name}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                select
                size="small"
                label={t(THEME_FIELD_COPY[name].labelKey)}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
              >
                {fonts.map((font) => (
                  <MenuItem key={font.key} value={font.key} sx={{ fontFamily: font.stack }}>
                    {font.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        ))}
      </Box>
      <SliderField
        name="base_font_size"
        label={t(THEME_FIELD_COPY.base_font_size.labelKey)}
        {...EMAIL_THEME_RANGES.base_font_size}
      />
    </Stack>
  );
}
