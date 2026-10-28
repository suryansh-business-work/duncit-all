import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Box, InputAdornment, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import type { LiteMe } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSession } from '../../../../shared/session';
import { CoverUploader } from '../../../components/CoverUploader';
import { LITE_UPDATE_PROFILE } from '../../../graphql/profile';
import { SOCIAL_PREFIX } from '../../../lib/social';
import { SOCIAL_FIELDS, makeProfileSchema, profileDefaults, toProfileInput, type ProfileOutput, type ProfileValues } from './profile.types';

/** Name, handle, bio, picture and the social links shown on the public profile. */
export function ProfileForm({ me }: Readonly<{ me: LiteMe }>) {
  const { t } = useWebT();
  const { refresh } = useLiteSession();
  const schema = useMemo(() => makeProfileSchema(t), [t]);
  const [updateProfile] = useMutation(LITE_UPDATE_PROFILE);
  const { control, handleSubmit, formState, reset } = useForm<ProfileValues, unknown, ProfileOutput>({ resolver: zodResolver(schema), defaultValues: profileDefaults(me) });

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await updateProfile({ variables: { input: toProfileInput(values) } });
      if (data?.liteUpdateProfile) reset(profileDefaults(data.liteUpdateProfile));
      await refresh();
      notifySuccess(t('liteWeb.profile.saved'));
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate data-testid="profile-form">
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 160px' } }}>
        <Stack spacing={2}>
          <RhfTextField control={control} name="name" label={t('liteWeb.profile.name')} autoComplete="name" hint={t('lite.auth.nameHint')} slotProps={{ htmlInput: { maxLength: 80, 'data-testid': 'profile-name' } }} />
          <RhfTextField
            control={control}
            name="handle"
            label={t('liteWeb.profile.handle')}
            hint={t('liteWeb.profile.handleHint')}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">@</InputAdornment> }, htmlInput: { maxLength: 30, autoCapitalize: 'none', 'data-testid': 'profile-handle' } }}
          />
        </Stack>
        <Controller
          control={control}
          name="avatar_url"
          render={({ field, fieldState }) => <CoverUploader label={t('liteWeb.profile.avatar')} value={field.value} onChange={field.onChange} shape="avatar" error={fieldState.error?.message} testId="profile-avatar" />}
        />
      </Box>
      <RhfTextField control={control} name="bio" label={t('liteWeb.profile.bio')} hint={t('liteWeb.profile.bioHint')} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500, 'data-testid': 'profile-bio' } }} />
      <Typography variant="body2" component="h3" sx={{ fontWeight: 700 }}>
        {t('liteWeb.settings.social')}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        {SOCIAL_FIELDS.map((key) => (
          <RhfTextField
            key={key}
            control={control}
            name={`social.${key}`}
            label={t(`liteWeb.settings.networks.${key}`)}
            slotProps={{
              input: SOCIAL_PREFIX[key] ? { startAdornment: <InputAdornment position="start">{SOCIAL_PREFIX[key]}</InputAdornment> } : undefined,
              htmlInput: { maxLength: key === 'website' ? 2048 : 100, autoCapitalize: 'none', inputMode: key === 'website' ? 'url' : 'text', 'data-testid': `profile-social-${key}` },
            }}
          />
        ))}
      </Box>
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }} data-testid="profile-save">
        {t('liteWeb.settings.saveChanges')}
      </DuncitButton>
    </Stack>
  );
}
