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
import SentMessage from '../wa-message';
import CampaignMeta from './CampaignMeta';
import DetailActions from './DetailActions';
import RecipientTable from './RecipientTable';
import SummaryTiles from './SummaryTiles';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  campaignId: string | null;
  /** Saved lists, so an AUDIENCE_LIST campaign shows the list's name. */
  audienceLists: WaAudienceList[];
  /** The symbol the rate card is kept in. */
  currency: string;
  retrying: boolean;
  cancelling: boolean;
  /** Re-attempt only the people this campaign did not reach. */
  onRetry: (campaign: WaCampaignRow) => void;
  /** Calls off a scheduled send before its hour. */
  onCancel: (campaign: WaCampaignRow) => void;
  /** Hands the campaign to the confirmation the page owns. */
  onDelete: (campaign: WaCampaignRow) => void;
  /** Start a new send prefilled from this one. */
  onDuplicate: (campaign: WaCampaignRow) => void;
  onClose: () => void;
}

/**
 * What one send did: the counters, what it was sent with, and every person it
 * walked over with the reason it did or did not reach them.
 *
 * This is what a CAMPAIGN row of the merged log opens; an automatic message
 * opens its own, much smaller, detail beside it. The template is named rather
 * than drawn here: what it says today is under Templates, live from AiSensy,
 * while this dialog is the record of one run — the category and rate it froze,
 * and per person the message id AiSensy returned or the reason it refused.
 */
export default function WaCampaignDetailDialog({
  campaignId,
  audienceLists,
  currency,
  retrying,
  cancelling,
  onRetry,
  onCancel,
  onDelete,
  onDuplicate,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
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

  const audienceText = [campaign ? labelFor(WA_AUDIENCE_LABELS, campaign.audience) : '', listName]
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

            <SentMessage
              campaignName={campaign.wa_campaign_name}
              params={campaign.template_params}
              note={t('marketingWhatsapp.logs.messagePerRecipient')}
            />

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" fontWeight={900}>
                Recipients
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sent means AiSensy accepted the message and returned an id for it. WhatsApp
                delivered/read status is not part of that answer.
              </Typography>
            </Stack>
            <RecipientTable
              campaignId={campaign.campaign_id}
              campaignName={campaign.wa_campaign_name}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <DetailActions
          campaign={campaign}
          retrying={retrying}
          cancelling={cancelling}
          exporting={exporting}
          onRetry={onRetry}
          onCancel={onCancel}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onExportCsv={exportCsv}
        />
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
