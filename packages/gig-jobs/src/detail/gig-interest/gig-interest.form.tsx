import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { gigInterestDefaults, makeGigInterestSchema } from '@duncit/forms/schemas';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import ContactSharingNotice from '../../ContactSharingNotice';
import type { GigInterestFormProps, GigInterestValues } from './gig-interest.types';

/** "I'm interested": an optional note, then contacts are swapped. */
export default function GigInterestForm({ busy, errorMessage, onSubmit, onCancel }: Readonly<GigInterestFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeGigInterestSchema(t), [t]);
  const { control, handleSubmit } = useForm<GigInterestValues>({
    defaultValues: gigInterestDefaults,
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} data-testid="gig-interest-form">
      <Stack spacing={2}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField
          control={control}
          name="message"
          label={t('gigJobs.interest.messageLabel')}
          placeholder={t('gigJobs.interest.messagePlaceholder')}
          multiline
          minRows={3}
        />
        <ContactSharingNotice />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('gigJobs.form.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} disabled={busy} data-testid="gig-interest-submit">
            {t('gigJobs.interest.confirm')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
