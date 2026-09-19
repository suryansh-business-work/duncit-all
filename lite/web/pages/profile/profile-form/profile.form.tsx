import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Divider, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import type { LiteMe } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSession } from '../../../../shared/session';
import { CoverUploader } from '../../../components/CoverUploader';
import { LITE_UPDATE_PROFILE } from '../../../graphql/profile';
import { makeProfileSchema, profileDefaults, toProfileInput, type ProfileValues } from './profile.types';

/** Name, handle, bio, picture, and the UPI details paid events are prefilled with. */
export function ProfileForm({ me }: Readonly<{ me: LiteMe }>) {
  const { t } = useWebT();
  const { refresh } = useLiteSession();
  const schema = useMemo(() => makeProfileSchema(t), [t]);
  const [updateProfile] = useMutation(LITE_UPDATE_PROFILE);
  const { control, handleSubmit, formState, reset } = useForm<ProfileValues>({ resolver: zodResolver(schema), defaultValues: profileDefaults(me) });

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
    <Stack component="form" spacing={2} onSubmit={submit} noValidate data-testid="profile-form">
      <TextField label={t('lite.auth.email')} value={me.email} fullWidth slotProps={{ input: { readOnly: true }, htmlInput: { 'data-testid': 'profile-email' } }} helperText={me.duncit_linked ? t('liteWeb.profile.duncitLinked') : ' '} />
      <RhfTextField control={control} name="name" label={t('liteWeb.profile.name')} autoComplete="name" hint={t('lite.auth.nameHint')} slotProps={{ htmlInput: { maxLength: 80, 'data-testid': 'profile-name' } }} />
      <RhfTextField control={control} name="handle" label={t('liteWeb.profile.handle')} hint={t('liteWeb.profile.handleHint')} slotProps={{ htmlInput: { maxLength: 30, 'data-testid': 'profile-handle' } }} />
      <RhfTextField control={control} name="bio" label={t('liteWeb.profile.bio')} hint={t('liteWeb.profile.bioHint')} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500, 'data-testid': 'profile-bio' } }} />
      <Controller
        control={control}
        name="avatar_url"
        render={({ field, fieldState }) => (
          <CoverUploader label={t('liteWeb.profile.avatar')} value={field.value} onChange={field.onChange} shape="avatar" error={fieldState.error?.message} testId="profile-avatar" />
        )}
      />
      <Divider />
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t('liteWeb.profile.paymentsTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('liteWeb.profile.paymentsHint')}
      </Typography>
      <RhfTextField control={control} name="upi_id" label={t('liteWeb.profile.upiId')} hint={t('liteWeb.profile.upiIdHint')} slotProps={{ htmlInput: { maxLength: 256, 'data-testid': 'profile-upi-id' } }} />
      <RhfTextField control={control} name="upi_name" label={t('liteWeb.profile.upiName')} hint={t('liteWeb.profile.upiNameHint')} slotProps={{ htmlInput: { maxLength: 80, 'data-testid': 'profile-upi-name' } }} />
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-end' }} data-testid="profile-save">
        {t('lite.common.save')}
      </DuncitButton>
    </Stack>
  );
}
