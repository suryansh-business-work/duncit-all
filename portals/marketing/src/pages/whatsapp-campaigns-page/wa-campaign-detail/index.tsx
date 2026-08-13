import { useLazyQuery, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import { notifyError } from '@duncit/dialogs';
import { StatusChip } from '@duncit/ui';
import { downloadTextFile, parseApiError } from '@duncit/utils';
import { WA_AUDIENCE_LABELS, WA_STATUS_COLORS, labelFor } from '../helpers';
import {
  WA_CAMPAIGN,
  WA_CAMPAIGN_RECIPIENTS_CSV,
  type WaAudienceList,
  type WaCampaignRow,
} from '../queries';
import CampaignMeta from './CampaignMeta';
import RecipientTable from './RecipientTable';
import SummaryTiles from './SummaryTiles';

interface Props {
  campaignId: string | null;
  /** Saved lists, so an AUDIENCE_LIST campaign shows the list's name. */
  audienceLists: WaAudienceList[];
  /** The symbol the rate card is kept in. */
  currency: string;
  retrying: boolean;
  /** Re-attempt only the people this campaign did not reach. */
  onRetry: (campaign: WaCampaignRow) => void;
  /** Start a new send prefilled from this one. */
  onDuplicate: (campaign: WaCampaignRow) => void;
  onClose: () => void;
}

/**
 * What one send did: the counters, what it was sent with, and every person it
 * walked over with the reason it did or did not reach them.
 *
 * The template is named rather than drawn here: what it says today is under
 * Templates, live from AiSensy, while this dialog is the record of one run —
 * the category and rate it froze, and per person the message id AiSensy
 * returned or the reason it refused.
 */
export default function WaCampaignDetailDialog({
  campaignId,
  audienceLists,
  currency,
  retrying,
  onRetry,
  onDuplicate,
  onClose,
}: Readonly<Props>) {
  const { data, loading } = useQuery<{ waCampaign: WaCampaignRow }>(WA_CAMPAIGN, {
    variables: { campaign_id: campaignId },
    skip: !campaignId,
    fetchPolicy: 'cache-and-network',
  });
  const campaign = data?.waCampaign;
  const listName = audienceLists.find((list) => list.id === campaign?.audience_list_id)?.name;
  const [fetchCsv, { loading: exporting }] = useLazyQuery(WA_CAMPAIGN_RECIPIENTS_CSV, {
    fetchPolicy: 'network-only',
  });

  /** The list as a spreadsheet — every row, built by the server. */
  const exportCsv = async () => {
    if (!campaign) return;
    try {
      const result = await fetchCsv({ variables: { campaign_id: campaign.campaign_id } });
      const csv = result.data?.waCampaignRecipientsCsv;
      if (csv) downloadTextFile(csv, `${campaign.name}-recipients.csv`, 'text/csv');
    } catch (e) {
      notifyError(parseApiError(e, 'Could not build the recipient list'));
    }
  };

  const unreached = (campaign?.failed_count ?? 0) + (campaign?.skipped_count ?? 0);
  let retryLabel = 'Everyone was reached';
  if (unreached > 0) retryLabel = `Retry ${unreached.toLocaleString()} not reached`;
  if (retrying) retryLabel = 'Retrying…';
  const audienceText = [
    campaign ? labelFor(WA_AUDIENCE_LABELS, campaign.audience) : '',
    listName,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={!!campaignId} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <span>{campaign?.name ?? 'Campaign'}</span>
          {campaign && <StatusChip status={campaign.status} colorMap={WA_STATUS_COLORS} />}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading && !campaign ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : null}
        {campaign && (
          <Stack spacing={2}>
            {campaign.error && <Alert severity="error">{campaign.error}</Alert>}

            <SummaryTiles campaign={campaign} />

            <CampaignMeta campaign={campaign} audienceText={audienceText} currency={currency} />

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" fontWeight={900}>
                Recipients
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sent means AiSensy accepted the message and returned an id for it. WhatsApp
                delivered/read status is not part of that answer.
              </Typography>
            </Stack>
            <RecipientTable campaignId={campaign.campaign_id} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1}>
          {/* Only the people it did not reach — the audience is not re-resolved,
              so a retry can never widen who the campaign touched. */}
          <Button
            startIcon={<ReplayIcon />}
            disabled={!unreached || retrying}
            onClick={() => campaign && onRetry(campaign)}
          >
            {retryLabel}
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            disabled={!campaign || exporting}
            onClick={exportCsv}
          >
            {exporting ? 'Building…' : 'Download CSV'}
          </Button>
          <Button
            startIcon={<ContentCopyIcon />}
            disabled={!campaign}
            onClick={() => campaign && onDuplicate(campaign)}
          >
            Duplicate
          </Button>
        </Stack>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
