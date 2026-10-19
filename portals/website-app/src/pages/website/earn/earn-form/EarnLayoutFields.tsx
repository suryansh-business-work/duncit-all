import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, MenuItem, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  EARN_ACCENTS,
  EARN_POSITIONS,
  EARN_VARIANTS,
  type EarnAccent,
  type EarnFormOutput,
  type EarnFormValues,
  type EarnPosition,
  type EarnVariant,
} from './earn.types';

// Every key is written out whole so the translation gate can find it.
const POSITION_KEYS: Record<EarnPosition, string> = {
  AFTER_REELS: 'websiteApp.earn.positionAfterReels',
  AFTER_DOWNLOAD: 'websiteApp.earn.positionAfterDownload',
  BEFORE_FOOTER: 'websiteApp.earn.positionBeforeFooter',
};
const VARIANT_KEYS: Record<EarnVariant, string> = {
  WALL: 'websiteApp.earn.variantWall',
  SPLIT: 'websiteApp.earn.variantSplit',
};
const ACCENT_KEYS: Record<EarnAccent, string> = {
  PRIMARY: 'websiteApp.earn.accentPrimary',
  SECONDARY: 'websiteApp.earn.accentSecondary',
  TERTIARY: 'websiteApp.earn.accentTertiary',
};

interface Props {
  control: Control<EarnFormValues, unknown, EarnFormOutput>;
}

/** Whether the section shows, where it sits, and how it looks. */
export default function EarnLayoutFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="enabled"
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
            label={t('websiteApp.earn.enabled')}
          />
        )}
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <RhfTextField control={control} name="position" select label={t('websiteApp.earn.position')} hint={t('websiteApp.earn.positionHint')}>
          {EARN_POSITIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {t(POSITION_KEYS[value])}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="variant" select label={t('websiteApp.earn.variant')} hint={t('websiteApp.earn.variantHint')}>
          {EARN_VARIANTS.map((value) => (
            <MenuItem key={value} value={value}>
              {t(VARIANT_KEYS[value])}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="accent" select label={t('websiteApp.earn.accent')} hint={t('websiteApp.earn.accentHint')}>
          {EARN_ACCENTS.map((value) => (
            <MenuItem key={value} value={value}>
              {t(ACCENT_KEYS[value])}
            </MenuItem>
          ))}
        </RhfTextField>
      </Stack>
    </Stack>
  );
}
