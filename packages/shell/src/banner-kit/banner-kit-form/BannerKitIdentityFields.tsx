import { Controller } from 'react-hook-form';
import { FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { BANNER_KIT_LIMITS } from '@duncit/forms/schemas';
import { SingleImageUploadField } from '@duncit/media-picker';
import { HelpTip } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';
import type { BannerKitControl } from './banner-kit.types';

interface Props {
  control: BannerKitControl;
  /** The ImageKit feature folder the logo is filed under. */
  folder: string;
}

/** The kit's logo, Instagram account (and whether it may be invited to collab), tagline, bio and brand colour. */
export function BannerKitIdentityFields({ control, folder }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="logo_url"
        render={({ field }) => (
          <SingleImageUploadField
            variant="avatar"
            shape="square"
            folder={folder}
            label={t('shell.bannerKit.logo')}
            helperText={t('shell.bannerKit.logoHint')}
            value={field.value}
            onChange={field.onChange}
            uploadTestId="banner-kit-logo-upload"
          />
        )}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <RhfTextField
          control={control}
          name="instagram_handle"
          label={t('shell.bannerKit.instagram')}
          hint={t('shell.bannerKit.instagramHint')}
          size="small"
          slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false, 'data-testid': 'banner-kit-instagram' } }}
        />
        <Stack direction="row" sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Controller
            control={control}
            name="collab_opt_in"
            render={({ field }) => (
              <FormControlLabel
                label={t('shell.bannerKit.collab')}
                control={
                  <Switch checked={field.value} onChange={(_event, checked) => field.onChange(checked)} />
                }
              />
            )}
          />
          <HelpTip title={t('shell.bannerKit.collabHelp')} label={t('shell.bannerKit.collab')} />
        </Stack>
      </Stack>
      <RhfTextField
        control={control}
        name="tagline"
        label={t('shell.bannerKit.tagline')}
        size="small"
        slotProps={{ htmlInput: { maxLength: BANNER_KIT_LIMITS.tagline, 'data-testid': 'banner-kit-tagline' } }}
      />
      <RhfTextField
        control={control}
        name="bio"
        label={t('shell.bannerKit.bio')}
        multiline
        minRows={3}
        size="small"
        slotProps={{ htmlInput: { maxLength: BANNER_KIT_LIMITS.bio, 'data-testid': 'banner-kit-bio' } }}
      />
      <Controller
        control={control}
        name="brand_color"
        render={({ field, fieldState }) => (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <TextField
              {...field}
              inputRef={field.ref}
              size="small"
              fullWidth
              label={t('shell.bannerKit.brandColor')}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? t('shell.bannerKit.brandColorHint')}
              slotProps={{ htmlInput: { 'data-testid': 'banner-kit-color' } }}
            />
            <DuncitButton size="small" disabled={!field.value} onClick={() => field.onChange('')}>
              {t('shell.bannerKit.clearColor')}
            </DuncitButton>
          </Stack>
        )}
      />
    </Stack>
  );
}
