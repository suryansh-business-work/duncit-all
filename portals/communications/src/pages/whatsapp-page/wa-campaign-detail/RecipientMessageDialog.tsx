import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { WaMediaRef } from '@duncit/communication';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import SentMessage from '../wa-message';
import SentVariables from '../wa-message/SentVariables';
import { WA_RECIPIENT_STATUS_COLORS } from '../helpers';
import type { WaCampaignRecipientRow } from '../queries';

interface Props {
  /** The row that was opened; null keeps the dialog closed. */
  recipient: WaCampaignRecipientRow | null;
  /** The AiSensy campaign the send was addressed to. */
  campaignName: string;
  /** The header asset the send froze — the same one for every recipient. */
  media?: WaMediaRef;
  onClose: () => void;
}

/**
 * The message ONE person got.
 *
 * The campaign's own preview can only show the send as it was written, and a
 * value written as `{{first_name}}` is resolved per person while the walk runs
 * — so the campaign bubble is the shape and this is the message. It is the
 * answer to the only question a complaint ever asks: what did it say to me.
 *
 * A person the send did not reach gets no bubble. There is no message to draw
 * for them, and drawing one anyway would put words on screen that nobody ever
 * read; the values it was carrying for them are still the record, so those stay.
 */
export default function RecipientMessageDialog({
  recipient,
  campaignName,
  media,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const delivered = recipient?.status === 'SENT';

  return (
    <Dialog open={Boolean(recipient)} onClose={onClose} fullWidth maxWidth="sm">
      {recipient && (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <span>{recipient.name || recipient.destination}</span>
              <StatusChip status={recipient.status} colorMap={WA_RECIPIENT_STATUS_COLORS} />
            </Stack>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {recipient.destination}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              {recipient.reason && <Alert severity="info">{recipient.reason}</Alert>}
              {delivered ? (
                <SentMessage
                  campaignName={campaignName}
                  params={recipient.template_params}
                  media={media}
                />
              ) : (
                <Stack spacing={1}>
                  <Alert severity="warning">
                    {t('marketingWhatsapp.logs.messageNotDelivered')}
                  </Alert>
                  <Typography variant="overline" sx={{
                    color: "text.secondary"
                  }}>
                    {t('marketingWhatsapp.logs.variablesTitle')}
                  </Typography>
                  <SentVariables params={recipient.template_params} body="" />
                </Stack>
              )}
            </Stack>
          </DialogContent>
        </>
      )}
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
