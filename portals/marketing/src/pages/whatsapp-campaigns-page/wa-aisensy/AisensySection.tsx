import type { ReactNode } from 'react';
import { Alert, AlertTitle, CircularProgress, Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  /** False when the Tech portal has no Project credentials yet. */
  configured: boolean;
  loading: boolean;
  error?: unknown;
  count: number;
  emptyText: string;
  children: ReactNode;
}

/**
 * The shared frame for the two AiSensy-fed sections. Both read live from
 * AiSensy, so both fail the same three ways — no credentials, AiSensy refused,
 * nothing there — and a refusal is shown verbatim: it carries the URL and
 * AiSensy's own reply, which is the whole diagnosis.
 */
export default function AisensySection({
  configured,
  loading,
  error,
  count,
  emptyText,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!configured) {
    return (
      <Alert severity="warning">
        Add the AiSensy <strong>{t('marketing.whatsappCampaigns.projectId')}</strong> and <strong>{t('marketing.whatsappCampaigns.projectApiKey')}</strong> in the Tech
        portal (Environment Variables → AiSensy) to read campaigns and templates from AiSensy. The
        campaign key alone only sends.
      </Alert>
    );
  }
  if (loading && count === 0) {
    return (
      <Stack alignItems="center" sx={{ py: 5 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>{t('marketing.whatsappCampaigns.aisensyDidNotAnswer')}</AlertTitle>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {parseApiError(error, 'The Project API request failed')}
        </Typography>
      </Alert>
    );
  }
  if (count === 0) return <Alert severity="info">{emptyText}</Alert>;
  return <>{children}</>;
}
