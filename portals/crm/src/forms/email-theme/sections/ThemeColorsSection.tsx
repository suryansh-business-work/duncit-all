import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { EMAIL_THEME_COLOR_GROUPS as GROUPS } from '@duncit/forms/schemas';
import { THEME_FIELD_COPY } from '../themeFieldCopy';
import ColorField from './ColorField';

/** Light-mode colours, grouped as a reader sees them: brand, text, surfaces. */
export default function ThemeColorsSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      {GROUPS.map((group) => (
        <Stack key={group.titleKey} spacing={1}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.4 }}>
            {t(group.titleKey)}
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
            {group.fields.map((field) => {
              const { labelKey, hintKey } = THEME_FIELD_COPY[field];
              return <ColorField key={field} name={field} label={t(labelKey)} hint={hintKey ? t(hintKey) : undefined} />;
            })}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
