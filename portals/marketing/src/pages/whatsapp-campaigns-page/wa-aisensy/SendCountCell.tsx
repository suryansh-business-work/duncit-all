import { Stack, Tooltip, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { WithSendCount } from './useWaSendCounts';

interface Props {
  row: WithSendCount;
  /** Opens the Logs tab narrowed to the row's campaigns. */
  onOpenLogs: (campaigns: readonly string[]) => void;
}

/**
 * How many messages this row has actually produced, and the way into them.
 *
 * The number alone is only half an answer: a campaign nobody has pointed at and
 * a campaign that has rejected every message both read "0", and they are
 * opposite problems. So the attempts ride along whenever they differ from the
 * sends, and the figure opens the Logs already narrowed to this campaign —
 * which is where the reason behind each one is written down.
 */
export default function SendCountCell({ row, onOpenLogs }: Readonly<Props>) {
  const { t } = useTranslation();
  const { sent_count: sent, attempts_count: attempts } = row;

  if (attempts === 0) {
    return (
      <Tooltip title={t('marketingWhatsapp.sendCount.none')}>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          0
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={t('marketingWhatsapp.sendCount.hint', { vars: { sent, attempts } })}>
      <DuncitButton
        variant="text"
        size="small"
        onClick={() => onOpenLogs(row.send_campaigns)}
        sx={{ minWidth: 0, px: 0.75, py: 0.25 }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {sent.toLocaleString()}
          </Typography>
          {sent !== attempts && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('marketingWhatsapp.sendCount.ofAttempts', { vars: { attempts } })}
            </Typography>
          )}
        </Stack>
      </DuncitButton>
    </Tooltip>
  );
}
