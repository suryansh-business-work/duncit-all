import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Divider, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { PROFILE_BIO_MAX_LENGTH } from '@duncit/forms/schemas';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '../../../../i18n/useTranslation';
import { ProfileLinksFields } from './ProfileLinksFields';
import { makeProfileDetailsSchema, type ProfileDetailsValues } from './profile-details.types';

interface Props {
  defaultValues: ProfileDetailsValues;
  /** Saves; a thrown Error's message is shown under the form. */
  onSubmit: (values: ProfileDetailsValues) => Promise<void>;
  onCancel: () => void;
}

/** Photo, name, bio and links — the editable half of the portal profile. */
export function ProfileDetailsForm({ defaultValues, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeProfileDetailsSchema(t), [t]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ProfileDetailsValues>({
    defaultValues,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('shell.profile.genericError'));
    }
  });
  const saving = formState.isSubmitting;

  return (
    <form noValidate onSubmit={submit} data-testid="profile-details-form">
      <Stack spacing={2}>
        <Controller
          control={control}
          name="profile_photo"
          render={({ field }) => (
            <SingleImageUploadField
              variant="avatar"
              shape="circle"
              folder="/users"
              label={t('shell.profile.details.photo')}
              value={field.value}
              onChange={field.onChange}
              uploadTestId="profile-photo-upload"
            />
          )}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField
            control={control}
            name="first_name"
            label={t('shell.profile.firstName')}
            autoComplete="given-name"
            required
            size="small"
            slotProps={{ htmlInput: { 'data-testid': 'field-first_name' } }}
          />
          <RhfTextField
            control={control}
            name="last_name"
            label={t('shell.profile.lastName')}
            autoComplete="family-name"
            size="small"
            slotProps={{ htmlInput: { 'data-testid': 'field-last_name' } }}
          />
        </Stack>
        <RhfTextField
          control={control}
          name="bio"
          label={t('shell.profile.details.bio')}
          hint={t('mweb.accountEdit.bioHint', { vars: { max: PROFILE_BIO_MAX_LENGTH } })}
          multiline
          minRows={3}
          size="small"
          slotProps={{ htmlInput: { maxLength: PROFILE_BIO_MAX_LENGTH, 'data-testid': 'field-bio' } }}
        />
        <Divider />
        <ProfileLinksFields control={control} />
        {submitError && <Alert data-testid="account-edit-error" severity="error">{submitError}</Alert>}
        <Stack direction="row" spacing={1.5}>
          <DuncitButton data-testid="account-edit-submit" type="submit" variant="contained" disabled={saving}>
            {saving ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
          <DuncitButton onClick={onCancel} disabled={saving}>
            {t('shell.common.cancel')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
