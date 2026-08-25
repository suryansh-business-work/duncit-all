import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { WA_EVENT_BY_KEY } from '@duncit/communication';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { useDateFormat, useTranslation, whatsappCategoryCopy } from '@duncit/app-settings';
import SentMessage from '../wa-message';
import { categoryLabel, waRate } from '../helpers';
import { WHATSAPP_MESSAGE_LOG, type WaMessageLogRow } from '../queries';

/** SKIPPED stays grey: nobody was billed and nothing went wrong. */
const STATUS_COLORS: StatusColorMap = {
  SENDING: 'warning',
  SENT: 'success',
  SKIPPED: 'default',
  FAILED: 'error',
};

/** One label/value line. Hoisted so it isn't redefined each render (S6478). */
function MetaRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 170, fontWeight: 700 }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

interface Props {
  /** The log row being opened; null keeps the dialog closed. */
  logId: string | null;
  /** The symbol the rate card is kept in. */
  currency: string;
  onClose: () => void;
}

/**
 * One message the platform sent by itself, in full.
 *
 * The campaign half of the merged log opens the campaign detail it already
 * had — counters, a recipient table, retry. This half has none of those,
 * because an automatic message IS one recipient: what it has instead is the
 * values that filled its template, the id AiSensy returned, and the reason it
 * did or did not arrive. Those are exactly the fields the merged table has no
 * column for, which is why they are read only when a row is opened.
 */
export default function AutoLogDetail({ logId, currency, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, loading } = useQuery<{ whatsappMessageLog: WaMessageLogRow | null }>(
    WHATSAPP_MESSAGE_LOG,
    { variables: { id: logId }, skip: !logId, fetchPolicy: 'cache-and-network' }
  );
  const log = data?.whatsappMessageLog ?? null;
  const category = log ? whatsappCategoryCopy(t, log.category) : null;
  // The scenario registry names every placeholder it declares, so an automatic
  // message can label its values rather than number them. It is the same
  // catalogue the server sends from (rule 40), mirrored in @duncit/communication.
  const paramLabels = log ? WA_EVENT_BY_KEY.get(log.event_key)?.params : undefined;

  return (
    <Dialog open={Boolean(logId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <span>{t('marketingWhatsapp.logs.detailTitle')}</span>
          {log && <StatusChip status={log.status} colorMap={STATUS_COLORS} />}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading && !log && (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        )}
        {!loading && !log && (
          <Alert severity="warning">{t('marketingWhatsapp.logs.detailGone')}</Alert>
        )}
        {log && (
          <Stack spacing={2}>
            {/* The whole point of opening the row: why it did not arrive. */}
            {log.reason && <Alert severity="info">{log.reason}</Alert>}

            <Typography variant="body2" color="text.secondary">
              {t('marketingWhatsapp.logs.detailHint')}
            </Typography>

            <SentMessage campaignName={log.campaign} params={log.params} labels={paramLabels} />

            <Divider />

            <Stack spacing={0.75}>
              <MetaRow label={t('adminWhatsapp.logColScenario')}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {log.event_key}
                </Typography>
              </MetaRow>
              <MetaRow label={t('adminWhatsapp.logColCampaign')}>
                <Typography variant="body2">{log.campaign || EM_DASH}</Typography>
              </MetaRow>
              {/* Two different vocabularies, so they get two rows: ours is the
                  switch a person can turn off, Meta's is what set the rate. */}
              <MetaRow label={t('adminWhatsapp.logColCategory')}>
                <Typography variant="body2">{category?.label || EM_DASH}</Typography>
              </MetaRow>
              <MetaRow label={t('marketingWhatsapp.categoryLabel')}>
                <Chip size="small" label={categoryLabel(log.template_category)} />
              </MetaRow>
              <MetaRow label={t('adminWhatsapp.logColAudience')}>
                <Typography variant="body2">{log.audience || EM_DASH}</Typography>
              </MetaRow>
              <MetaRow label={t('adminWhatsapp.logColDestination')}>
                <Typography variant="body2">{log.destination || EM_DASH}</Typography>
              </MetaRow>
              <MetaRow label={t('marketingWhatsapp.logs.messageId')}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {log.submitted_message_id || EM_DASH}
                </Typography>
              </MetaRow>
              <MetaRow label={t('adminWhatsapp.logColRate')}>
                <Typography variant="body2">{waRate(log.msg_rate, currency)}</Typography>
              </MetaRow>
              <MetaRow label={t('adminWhatsapp.logColDuration')}>
                <Typography variant="body2">{`${log.duration_ms} ms`}</Typography>
              </MetaRow>
              <MetaRow label={t('adminWhatsapp.logColWhen')}>
                <Typography variant="body2">
                  {log.created_at ? formatDateTime(log.created_at) : EM_DASH}
                </Typography>
              </MetaRow>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
