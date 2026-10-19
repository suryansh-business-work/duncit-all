import type { Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { EARN_LIMITS, type EarnFormOutput, type EarnFormValues } from './earn.types';

interface Props {
  control: Control<EarnFormValues, unknown, EarnFormOutput>;
}

/** The section's words and button. Blank keeps the localized default copy. */
export default function EarnCopyFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const hint = (max: number) => t('websiteApp.earn.copyHint', { vars: { max } });

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" component="h3">
        {t('websiteApp.earn.copy')}
      </Typography>
      <RhfTextField
        control={control}
        name="eyebrow"
        label={t('websiteApp.earn.eyebrow')}
        hint={hint(EARN_LIMITS.eyebrow)}
        slotProps={{ htmlInput: { maxLength: EARN_LIMITS.eyebrow } }}
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="heading"
          label={t('websiteApp.earn.heading')}
          hint={hint(EARN_LIMITS.heading)}
          slotProps={{ htmlInput: { maxLength: EARN_LIMITS.heading } }}
        />
        <RhfTextField
          control={control}
          name="heading_muted"
          label={t('websiteApp.earn.headingMuted')}
          hint={hint(EARN_LIMITS.heading_muted)}
          slotProps={{ htmlInput: { maxLength: EARN_LIMITS.heading_muted } }}
        />
      </Stack>
      <RhfTextField
        control={control}
        name="text"
        label={t('websiteApp.earn.text')}
        hint={hint(EARN_LIMITS.text)}
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: EARN_LIMITS.text } }}
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="cta_label"
          label={t('websiteApp.earn.ctaLabel')}
          hint={hint(EARN_LIMITS.cta_label)}
          slotProps={{ htmlInput: { maxLength: EARN_LIMITS.cta_label } }}
        />
        <RhfTextField
          control={control}
          name="cta_url"
          type="url"
          label={t('websiteApp.earn.ctaUrl')}
          hint={t('websiteApp.earn.ctaUrlHint')}
          slotProps={{ htmlInput: { maxLength: EARN_LIMITS.url } }}
        />
      </Stack>
    </Stack>
  );
}
