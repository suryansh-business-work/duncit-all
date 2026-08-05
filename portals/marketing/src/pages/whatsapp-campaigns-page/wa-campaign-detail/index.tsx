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
  Stack,
  Typography,
} from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { WA_AUDIENCE_LABELS, WA_STATUS_COLORS, labelFor } from '../helpers';
import { WA_CAMPAIGN, type WaAudienceList, type WaCampaignRow } from '../queries';
import RecipientTable from './RecipientTable';
import SummaryTiles from './SummaryTiles';

/** One label/value line of campaign meta. Hoisted so it isn't redefined each
 * render (S6478). */
function MetaRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 150, fontWeight: 700 }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

interface Props {
  campaignId: string | null;
  /** Saved lists, so an AUDIENCE_LIST campaign shows the list's name. */
  audienceLists: WaAudienceList[];
  onClose: () => void;
}

/**
 * What one send did: the counters, what it was sent with, and every person it
 * walked over with the reason it did or did not reach them.
 *
 * The template's own text is not shown because AiSensy's campaign API cannot be
 * read back — the key it issues only sends. What IS from AiSensy is per person:
 * the message id it returned, or the reason it refused.
 */
export default function WaCampaignDetailDialog({
  campaignId,
  audienceLists,
  onClose,
}: Readonly<Props>) {
  const { formatDateTime } = useDateFormat();
  const { data, loading } = useQuery<{ waCampaign: WaCampaignRow }>(WA_CAMPAIGN, {
    variables: { campaign_id: campaignId },
    skip: !campaignId,
    fetchPolicy: 'cache-and-network',
  });
  const campaign = data?.waCampaign;
  const listName = audienceLists.find((list) => list.id === campaign?.audience_list_id)?.name;
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

            <Stack spacing={0.75}>
              <MetaRow label="WhatsApp campaign">
                <Typography variant="body2" fontWeight={700}>
                  {campaign.wa_campaign_name}
                </Typography>
              </MetaRow>
              <MetaRow label="Target audience">
                <Typography variant="body2">{audienceText}</Typography>
              </MetaRow>
              <MetaRow label="Template params">
                {campaign.template_params.length > 0 ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {campaign.template_params.map((param, index) => (
                      // Params are ordered and may repeat, so the position is
                      // the only stable identity a row has (S6479).
                      <Chip key={`${index}-${param}`} size="small" label={`{{${index + 1}}} ${param}`} />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2">None</Typography>
                )}
              </MetaRow>
              {campaign.scheduled_at && (
                <MetaRow label="Scheduled for">
                  <Typography variant="body2">{formatDateTime(campaign.scheduled_at)}</Typography>
                </MetaRow>
              )}
              <MetaRow label="Created">
                <Typography variant="body2">{formatDateTime(campaign.created_at)}</Typography>
              </MetaRow>
              <MetaRow label="Finished">
                <Typography variant="body2">
                  {campaign.sent_at ? formatDateTime(campaign.sent_at) : 'Still sending'}
                </Typography>
              </MetaRow>
            </Stack>

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
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
