import { useId } from 'react';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { tokens } from '@duncit/theme';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { outcomeText } from './deliveryColumns';
import type { WebhookDelivery } from './webhooks.queries';

/** The JSON Meta signed, indented for reading; kept as it came when it is not JSON. */
export function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

interface Props {
  delivery: WebhookDelivery | null;
  onClose: () => void;
}

/** One delivery opened: what it came to, and the raw payload exactly as Meta sent it. */
export default function DeliveryBodyDialog({ delivery, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const titleId = useId();
  if (!delivery) return null;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId} data-testid="webhook-delivery-dialog">
      <DialogTitle id={titleId}>{t('marketing.socialWebhooks.deliveryTitle', { vars: { time: formatDateTime(delivery.received_at) } })}</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          <Typography variant="body2">{outcomeText(t, delivery.outcome)}</Typography>
          {delivery.error && (
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {delivery.error}
            </Typography>
          )}
          <Typography variant="subtitle2" component="h3" id={`${titleId}-raw`}>
            {t('marketing.socialWebhooks.rawBody')}
          </Typography>
          {/* Wrapped, never scrolled sideways: the dialog's own scroll reaches every line by keyboard. */}
          <Box
            component="pre"
            aria-labelledby={`${titleId}-raw`}
            sx={{ m: 0, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontFamily: tokens.font.mono, fontSize: tokens.font.size.body2, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            data-testid="webhook-delivery-body"
          >
            {prettyBody(delivery.body)}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('marketing.socialWebhooks.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
