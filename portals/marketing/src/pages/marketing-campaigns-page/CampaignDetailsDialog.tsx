import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import CampaignHtmlFrame from './CampaignHtmlFrame';
import CampaignSummary from './CampaignSummary';
import CampaignEngagement from './CampaignEngagement';
import { CAMPAIGN_STATUS_COLORS, canDelete, canSend } from './helpers';
import { MARKETING_CAMPAIGN, type MarketingCampaignDetail } from './queries';
import type { CampaignAudienceList } from './marketing-campaign-form';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  campaignId: string | null;
  audienceLists: CampaignAudienceList[];
  busy: boolean;
  formatDateTime: (value: Date | string) => string;
  onClose: () => void;
  onSend: (campaign: MarketingCampaignDetail) => void;
  onDelete: (campaign: MarketingCampaignDetail) => void;
}

/** Everything about one campaign, including the email as it was actually
 * rendered — fetched on open so the table never carries the HTML. */
export default function CampaignDetailsDialog({
  campaignId,
  audienceLists,
  busy,
  formatDateTime,
  onClose,
  onSend,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ marketingCampaign: MarketingCampaignDetail }>(
    MARKETING_CAMPAIGN,
    { variables: { campaign_id: campaignId }, skip: !campaignId, fetchPolicy: 'cache-and-network' },
  );

  if (!campaignId) return null;

  const campaign = data?.marketingCampaign;

  return (
    <Dialog open fullWidth maxWidth="md" onClose={busy ? undefined : onClose}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              flex: 1
            }}>
            {campaign?.name ?? 'Campaign'}
          </Typography>
          {campaign && (
            <StatusChip status={campaign.status} colorMap={CAMPAIGN_STATUS_COLORS} />
          )}
        </Stack>
        {campaign && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {campaign.subject}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading && !campaign && (
          <Stack
            sx={{
              alignItems: "center",
              py: 4
            }}>
            <CircularProgress size={28} />
          </Stack>
        )}
        {error && <Alert severity="error">{parseApiError(error, 'Could not load the campaign')}</Alert>}
        {campaign && (
          <Stack spacing={2}>
            {campaign.error && <Alert severity="error">{campaign.error}</Alert>}
            <CampaignSummary
              campaign={campaign}
              audienceLists={audienceLists}
              formatDateTime={formatDateTime}
            />
            <CampaignEngagement campaign={campaign} formatDateTime={formatDateTime} />
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 1
                }}>
                Email
              </Typography>
              <CampaignHtmlFrame
                html={campaign.rendered_html ?? ''}
                title={t('marketing.marketingCampaigns.campaignEmail')}
                placeholder={t('marketing.marketingCampaigns.thisCampaignHasNotBeenRendered')}
                minHeight={380}
              />
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          Close
        </DuncitButton>
        {campaign && canDelete(campaign.status) && (
          <DuncitButton
            color="error"
            startIcon={<DeleteOutlineIcon />}
            disabled={busy}
            onClick={() => onDelete(campaign)}
          >
            Delete
          </DuncitButton>
        )}
        {campaign && canSend(campaign.status) && (
          <DuncitButton
            variant="contained"
            startIcon={<SendIcon />}
            disabled={busy}
            onClick={() => onSend(campaign)}
          >
            Send now
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
