import { useWatch, type Control } from 'react-hook-form';
import { Box, MenuItem, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import RhfSwitch from '../../../../../components/form/RhfSwitch';
import { TWO_COLUMNS } from '../../../../../lib/layout';
import { storeLinks } from '../../../../../lib/store-links';
import { OCCASION_THEME_KEYS, OCCASION_THEMES } from './occasion-themes';
import { MAX_GREETING, type OccasionsValues } from './occasion.rules';

interface OccasionThemeFieldsProps {
  control: Control<OccasionsValues>;
  index: number;
  /** Names the row, e.g. "Occasion 2" — for the preview button's accessible name. */
  rowLabel: string;
}

/** The festive look an occasion wears: its theme, whether it animates, its greeting — and a preview of it. */
export default function OccasionThemeFields({ control, index, rowLabel }: Readonly<OccasionThemeFieldsProps>) {
  const { t } = useTranslation();
  const path = `occasions.${index}` as const;
  const theme = useWatch({ control, name: `${path}.theme` });
  const previewLabel = t('ecommPortal.settings.occasionPreview');
  const previewNamed = t('ecommPortal.settings.occasionPreviewNamed', { vars: { name: rowLabel } });
  return (
    <Stack spacing={1}>
      <Box sx={TWO_COLUMNS}>
        <RhfTextField
          control={control}
          name={`${path}.theme`}
          label={t('ecommPortal.settings.occasionTheme')}
          hint={t('ecommPortal.settings.occasionThemeHint')}
          select
          data-testid="settings-occasion-theme"
        >
          {OCCASION_THEMES.map((value) => (
            <MenuItem key={value} value={value}>
              {t(OCCASION_THEME_KEYS[value])}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField
          control={control}
          name={`${path}.greeting`}
          label={t('ecommPortal.settings.occasionGreeting')}
          hint={t('ecommPortal.settings.occasionGreetingHint')}
          slotProps={{ htmlInput: { maxLength: MAX_GREETING } }}
          data-testid="settings-occasion-greeting"
        />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <RhfSwitch
          control={control}
          name={`${path}.effects_enabled`}
          label={t('ecommPortal.settings.occasionEffects')}
          hint={t('ecommPortal.settings.occasionEffectsHint')}
          testId="settings-occasion-effects"
        />
        <DuncitButton
          variant="outlined"
          href={storeLinks.preview(theme ?? 'NONE')}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
          aria-label={t('ecommPortal.common.opensInNewTab', { vars: { label: previewNamed } })}
          sx={{ alignSelf: 'flex-start' }}
          data-testid="settings-occasion-preview"
        >
          {previewLabel}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
