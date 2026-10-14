import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { fileToBase64, parseApiError } from '@duncit/utils';
import type { MutationCrmVerifyEmailsBulkArgs } from '@duncit/gql-types';
import { CRM_VERIFY_EMAILS_BULK } from '../../../api/emailVerification.gql';

/** Upload a CSV/XLSX; the server checks every address as a background job (progress in the header). */
export function BulkCheckCard({ running }: Readonly<{ running: number }>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [startBulk, { loading }] = useMutation<
    { crmVerifyEmailsBulk: { id: string; total: number } },
    MutationCrmVerifyEmailsBulkArgs
  >(
    CRM_VERIFY_EMAILS_BULK,
    { refetchQueries: ['MyBackgroundJobs'] }
  );
  const busy = reading || loading;

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError('');
    setReading(true);
    try {
      const content = await fileToBase64(file);
      const { data } = await startBulk({
        variables: { content_base64: content, filename: file.name, url: globalThis.location.pathname },
      });
      const total = data?.crmVerifyEmailsBulk.total ?? 0;
      notifySuccess(t('crm.emailVerifier.bulkStarted', { count: total }));
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <div>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              {t('crm.emailVerifier.bulkTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('crm.emailVerifier.bulkSubtitle')}
            </Typography>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls"
            hidden
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            data-testid="email-bulk-input"
          />
          <DuncitButton
            variant="outlined"
            startIcon={<UploadFileIcon />}
            loading={busy}
            onClick={() => inputRef.current?.click()}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="email-bulk-upload"
          >
            {busy ? t('crm.emailVerifier.uploading') : t('crm.emailVerifier.chooseFile')}
          </DuncitButton>
          {error && <Alert severity="error">{error}</Alert>}
          {running > 0 && (
            <Alert severity="info" data-testid="email-bulk-running">
              {t('crm.emailVerifier.bulkRunning', { count: running })}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
