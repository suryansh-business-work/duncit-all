import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { E2eSettingsValues } from './e2e-settings.types';

interface Props {
  control: Control<E2eSettingsValues>;
  errors: FieldErrors<E2eSettingsValues>;
  passwordSet: boolean;
}

/**
 * The identity every run signs in and signs up as.
 *
 * The preview is the point of the whole card: the signup address carries a
 * stamp that is unique to the run, and seeing the shape before saving is the
 * difference between configuring it once and discovering on the third nightly
 * sweep that every signup collided on the same address.
 */
export default function IdentityFields({ control, errors, passwordSet }: Readonly<Props>) {
  const { t } = useTranslation();
  const prefix = useWatch({ control, name: 'email_prefix' });
  const domain = useWatch({ control, name: 'email_domain' });

  // Built here rather than read back from the server so it moves as the
  // operator types. The stamp is a sample of the shape, not this run's own.
  const sample = '070920260300';
  const login = prefix && domain ? `${prefix.replace(/\+$/, '')}@${domain}` : '';
  const signup = prefix && domain ? `${prefix}${sample}@${domain}` : '';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Controller
          name="email_prefix"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('tech.e2e.emailPrefix')}
              error={Boolean(errors.email_prefix)}
              helperText={errors.email_prefix?.message ?? t('tech.e2e.emailPrefixHint')}
              sx={{ flex: 1 }}
            />
          )}
        />
        <Controller
          name="email_domain"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('tech.e2e.emailDomain')}
              error={Boolean(errors.email_domain)}
              helperText={errors.email_domain?.message ?? t('tech.e2e.emailDomainHint')}
              sx={{ flex: 1 }}
            />
          )}
        />
      </Stack>

      {login && (
        <Alert severity="info" variant="outlined">
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {t('tech.e2e.previewLogin', { vars: { email: login } })}
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {t('tech.e2e.previewSignup', { vars: { email: signup } })}
          </Typography>
          <Typography variant="caption">{t('tech.e2e.previewHint')}</Typography>
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="password"
              autoComplete="new-password"
              label={t('tech.e2e.password')}
              placeholder={passwordSet ? t('tech.e2e.passwordSaved') : ''}
              helperText={t('tech.e2e.passwordHint')}
              sx={{ flex: 1 }}
            />
          )}
        />
        <Controller
          name="identity_phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('tech.e2e.identityPhone')}
              helperText={t('tech.e2e.identityPhoneHint')}
              sx={{ flex: 1 }}
            />
          )}
        />
      </Stack>
    </Stack>
  );
}
