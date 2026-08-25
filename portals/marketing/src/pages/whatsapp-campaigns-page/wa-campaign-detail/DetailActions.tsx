import { Button, Stack, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ReplayIcon from '@mui/icons-material/Replay';
import { useTranslation } from '@duncit/app-settings';
import { canCancel, canDelete } from '../helpers';
import type { WaCampaignRow } from '../queries';

interface Props {
  /** Absent while the campaign is still loading — everything stays disabled. */
  campaign?: WaCampaignRow;
  retrying: boolean;
  cancelling: boolean;
  exporting: boolean;
  onRetry: (campaign: WaCampaignRow) => void;
  onCancel: (campaign: WaCampaignRow) => void;
  onDelete: (campaign: WaCampaignRow) => void;
  onDuplicate: (campaign: WaCampaignRow) => void;
  onExportCsv: () => void;
}

/**
 * Everything you can do to one send.
 *
 * Cancel and Delete live here rather than as icons on the table row: the log is
 * one merged feed that carries automatic messages too, where neither action
 * means anything, and a destructive action is safer one click in. Both are
 * disabled rather than hidden, so somebody hunting for Cancel on a sent
 * campaign is told why it is unavailable instead of left looking.
 */
export default function DetailActions({
  campaign,
  retrying,
  cancelling,
  exporting,
  onRetry,
  onCancel,
  onDelete,
  onDuplicate,
  onExportCsv,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const unreached = (campaign?.failed_count ?? 0) + (campaign?.skipped_count ?? 0);
  // Only a send that has not started can be called off, and one mid-send cannot
  // be deleted — the server refuses both, so the buttons say so first.
  const cancellable = Boolean(campaign) && canCancel(campaign?.status ?? '');
  const deletable = Boolean(campaign) && canDelete(campaign?.status ?? '');

  let retryLabel = t('marketingWhatsapp.logs.retryNone');
  if (unreached > 0) {
    retryLabel = t('marketingWhatsapp.logs.retryUnreached', {
      vars: { count: unreached.toLocaleString() },
    });
  }
  if (retrying) retryLabel = t('marketingWhatsapp.logs.retrying');

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      {/* Only the people it did not reach — the audience is not re-resolved,
          so a retry can never widen who the campaign touched. */}
      <Button
        startIcon={<ReplayIcon />}
        disabled={!unreached || retrying}
        onClick={() => campaign && onRetry(campaign)}
      >
        {retryLabel}
      </Button>
      <Button startIcon={<DownloadIcon />} disabled={!campaign || exporting} onClick={onExportCsv}>
        {exporting
          ? t('marketingWhatsapp.logs.building')
          : t('marketingWhatsapp.logs.downloadCsv')}
      </Button>
      <Button
        startIcon={<ContentCopyIcon />}
        disabled={!campaign}
        onClick={() => campaign && onDuplicate(campaign)}
      >
        {t('marketingWhatsapp.logs.duplicate')}
      </Button>
      <Tooltip title={cancellable ? '' : t('marketingWhatsapp.logs.cancelOnlyScheduled')}>
        <span>
          <Button
            startIcon={<EventBusyIcon />}
            disabled={!cancellable || cancelling}
            onClick={() => campaign && onCancel(campaign)}
          >
            {cancelling
              ? t('marketingWhatsapp.logs.cancelling')
              : t('marketingWhatsapp.logs.cancelSend')}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={deletable ? '' : t('marketingWhatsapp.logs.deleteWhileSending')}>
        <span>
          <Button
            color="error"
            startIcon={<DeleteOutlineIcon />}
            disabled={!deletable}
            onClick={() => campaign && onDelete(campaign)}
          >
            {t('shell.common.delete')}
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
}
