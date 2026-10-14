import { useState } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { CrmEmailVerification } from '../../../api/emailVerification.gql';
import { useEmailStatusStore } from '../../../components/email-status';
import { EmailVerifyForm, type EmailVerifyFormValues } from '../../../forms/email-verify';
import { VerificationResult } from './VerificationResult';

/** Check one address now; the result also updates its badge across the CRM. */
export function SingleCheckCard({ onChecked }: Readonly<{ onChecked: () => void }>) {
  const { t } = useTranslation();
  const store = useEmailStatusStore();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CrmEmailVerification | null>(null);

  const submit = async ({ email }: EmailVerifyFormValues) => {
    if (!store) return;
    setSubmitting(true);
    const checked = await store.verify(email);
    setSubmitting(false);
    if (!checked) return;
    setResult(checked);
    onChecked();
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <div>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              {t('crm.emailVerifier.singleTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('crm.emailVerifier.singleSubtitle')}
            </Typography>
          </div>
          <EmailVerifyForm submitting={submitting} onSubmit={submit} />
          {result && <VerificationResult result={result} />}
        </Stack>
      </CardContent>
    </Card>
  );
}
