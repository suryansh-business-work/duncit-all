import { Box, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { BrandStepProps } from './step-types';

interface MediaSlotProps {
  label: string;
  url: string;
  disabled: boolean;
  testId: string;
  onPick: () => void;
  onClear: () => void;
}

/** One picture slot — preview, upload/change, remove. Hoisted to module scope (S6478). */
function MediaSlot({ label, url, disabled, testId, onPick, onClear }: Readonly<MediaSlotProps>) {
  const { t } = useTranslation();
  const pickLabel = url ? t('partners.brandWizard.media.change') : t('partners.becomeHostPage.upload');
  return (
    <Box sx={{ flex: 1 }} data-testid={testId}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      {url && (
        <Box
          component="img"
          src={url}
          alt={label}
          sx={{ display: 'block', width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 1, my: 0.5 }}
        />
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
        <DuncitButton size="small" startIcon={<UploadFileIcon />} variant="outlined" onClick={onPick} disabled={disabled}>
          {pickLabel}
        </DuncitButton>
        {url && !disabled && (
          <DuncitButton size="small" color="error" onClick={onClear}>
            {t('partners.ecommBrandPage.remove')}
          </DuncitButton>
        )}
      </Stack>
    </Box>
  );
}

interface Props extends BrandStepProps {
  onPickImage: () => Promise<string | null>;
}

/** Step 6 — the logo (required) and the cover image shown on the brand page. */
export default function MediaStep({ watch, setValue, locked, onPickImage }: Readonly<Props>) {
  const { t } = useTranslation();
  const logo = watch('logo_url');
  const cover = watch('cover_image_url');

  const pickInto = async (field: 'logo_url' | 'cover_image_url') => {
    const url = await onPickImage();
    if (url) setValue(field, url, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.media.intro')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <MediaSlot
          label={t('partners.ecommBrandPage.logo')}
          url={logo}
          disabled={locked}
          testId="brand-wizard-logo"
          onPick={() => pickInto('logo_url')}
          onClear={() => setValue('logo_url', '', { shouldDirty: true })}
        />
        <MediaSlot
          label={t('partners.ecommBrandPage.coverImage')}
          url={cover}
          disabled={locked}
          testId="brand-wizard-cover"
          onPick={() => pickInto('cover_image_url')}
          onClear={() => setValue('cover_image_url', '', { shouldDirty: true })}
        />
      </Stack>
      {!logo && (
        <Typography variant="caption" sx={{ color: 'warning.main' }}>
          {t('partners.brandWizard.media.logoRequired')}
        </Typography>
      )}
    </Stack>
  );
}
