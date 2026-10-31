import { useWatch, type Control } from 'react-hook-form';
import { Box, MenuItem, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { urlConfigs } from '../../../../config/url-configs';
import { RhfImage, RhfOnOff } from '../../rhf-fields';
import { TWO_COLUMNS } from '../layout';
import { STORE_THEME_KEYS, STORE_THEMES } from '../store-themes';
import { MAX_GREETING, type StoreOccasionsValues } from './store-occasions.types';

interface Props {
  control: Control<StoreOccasionsValues>;
  index: number;
  /** Names the row ("Occasion 2") for the preview link's accessible name. */
  rowLabel: string;
}

/** What the store wears in the window: its built-in look, greeting and animation, the swapped assets, and a preview. */
export default function StoreOccasionLook({ control, index, rowLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const path = `occasions.${index}` as const;
  const theme = useWatch({ control, name: `${path}.theme` });
  const previewHref = `${urlConfigs.storeUrl}/?occasion=${encodeURIComponent(theme)}`;

  return (
    <Stack spacing={2}>
      <Box sx={TWO_COLUMNS}>
        <RhfTextField control={control} name={`${path}.theme`} label={t('marketing.storeOccasions.theme')} hint={t('marketing.storeOccasions.themeHint')} select>
          {STORE_THEMES.map((value) => (
            <MenuItem key={value} value={value}>
              {t(STORE_THEME_KEYS[value])}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField
          control={control}
          name={`${path}.greeting`}
          label={t('marketing.storeOccasions.greeting')}
          hint={t('marketing.storeOccasions.greetingHint')}
          slotProps={{ htmlInput: { maxLength: MAX_GREETING } }}
        />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <RhfOnOff control={control} name={`${path}.effects_enabled`} label={t('marketing.storeOccasions.effects')} hint={t('marketing.storeOccasions.effectsHint')} />
        <DuncitButton
          variant="outlined"
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
          aria-label={t('marketing.storeOccasions.previewNamed', { vars: { name: rowLabel } })}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('marketing.storeOccasions.preview')}
        </DuncitButton>
      </Stack>
      <Box sx={TWO_COLUMNS}>
        <RhfImage control={control} name={`${path}.logo_url`} label={t('marketing.storeOccasions.logo')} folder="/store/occasions" />
        <RhfImage control={control} name={`${path}.favicon_url`} label={t('marketing.storeOccasions.favicon')} folder="/store/occasions" />
        <RhfImage control={control} name={`${path}.background_url`} label={t('marketing.storeOccasions.background')} folder="/store/occasions" />
        <RhfTextField
          control={control}
          name={`${path}.background_color`}
          label={t('marketing.storeOccasions.color')}
          hint={t('marketing.storeOccasions.colorHint')}
        />
      </Box>
      <RhfTextField
        control={control}
        name={`${path}.announcement_text`}
        label={t('marketing.storeOccasions.banner')}
        hint={t('marketing.storeOccasions.bannerHint')}
      />
    </Stack>
  );
}
