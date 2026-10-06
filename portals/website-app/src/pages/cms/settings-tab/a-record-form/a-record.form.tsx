import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { aRecordSchema, type ARecordFormOutput, type ARecordFormValues } from './a-record.types';

interface Props {
  host: string;
  current: string | null;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: ARecordFormOutput) => void;
  onCancel: () => void;
}

/** Point one of the site's hostnames at an IPv4 address — a new A record, or the one being repointed. */
export default function ARecordForm({ host, current, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => aRecordSchema((key) => t(key)), [t]);
  const { control, handleSubmit } = useForm<ARecordFormValues, unknown, ARecordFormOutput>({
    defaultValues: { ip: current ?? '' },
    resolver: zodResolver(schema) as Resolver<ARecordFormValues, unknown, ARecordFormOutput>,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-a-record-form">
      <Stack spacing={2}>
        <Typography>{current ? t('websiteApp.cms.dns.repointText', { vars: { host, current } }) : t('websiteApp.cms.dns.addText', { vars: { host } })}</Typography>
        <Alert severity="warning">{t('websiteApp.cms.dns.warning')}</Alert>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField control={control} name="ip" label={t('websiteApp.cms.dns.ip')} hint={t('websiteApp.cms.dns.ipHint')} required />
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={submitting}>
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
