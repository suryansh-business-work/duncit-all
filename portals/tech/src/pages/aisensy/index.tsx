import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  AISENSY_STATUS,
  SEND_AISENSY_CAMPAIGN,
  type AisensySendResult,
  type AisensyStatus,
  type SendAisensyCampaignInput,
} from './queries';
import { CampaignTestForm } from './campaign-test';

interface Result {
  ok: boolean;
  message: string;
}

/** Tech portal AiSensy page: shows whether the WhatsApp API key is configured
 * and sends a live template campaign with the advance test parameters. */
export default function AisensyPage() {
  const { data, loading } = useQuery(AISENSY_STATUS, { fetchPolicy: 'cache-and-network' });
  const [send, { loading: sending }] = useMutation(SEND_AISENSY_CAMPAIGN);
  const [result, setResult] = useState<Result | null>(null);
  const status: AisensyStatus | undefined = data?.aisensyStatus;

  const onSubmit = (input: SendAisensyCampaignInput) => {
    setResult(null);
    send({ variables: { input } })
      .then((response) => {
        const sent: AisensySendResult | undefined = response.data?.sendAisensyCampaign;
        setResult({
          ok: true,
          message: `${sent?.message ?? 'Submitted'} — message id ${sent?.submitted_message_id ?? ''}`,
        });
      })
      .catch((error) =>
        setResult({ ok: false, message: error instanceof Error ? error.message : 'Send failed' })
      );
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <WhatsAppIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>
            AiSensy
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Send WhatsApp template campaigns through AiSensy and test a live delivery.
          </Typography>
        </Box>
        {status?.configured && <Chip size="small" color="success" label="API key set" />}
      </Stack>

      {status?.configured ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              {result && (
                <Alert severity={result.ok ? 'success' : 'error'} onClose={() => setResult(null)}>
                  {result.message}
                </Alert>
              )}
              <CampaignTestForm
                defaultCampaign={status.default_campaign}
                busy={sending}
                onSubmit={onSubmit}
              />
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="warning">
          Add an AiSensy API key in Environment Variables → AiSensy to send WhatsApp campaigns.
        </Alert>
      )}
    </Stack>
  );
}
