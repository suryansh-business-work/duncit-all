import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import CampaignTable from './CampaignTable';
import CampaignDetailsDialog from './CampaignDetailsDialog';
import { deleteWarningFor } from './delete-copy';
import type { CampaignAudienceList } from './marketing-campaign-form';
import {
  AUDIENCE_LISTS_FOR_CAMPAIGN,
  DELETE_MARKETING_CAMPAIGN,
  MARKETING_CAMPAIGNS_TABLE,
  SEND_MARKETING_CAMPAIGN,
  type MarketingCampaignRow,
} from './queries';

/** Every campaign, with the two things you do to one: look at it, or remove
 * it. Creating happens on its own page — the MJML editor needs the width. */
export default function MarketingCampaignsPage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [target, setTarget] = useState<MarketingCampaignRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendCampaign, { loading: sending }] = useMutation(SEND_MARKETING_CAMPAIGN);
  const [deleteCampaign, { loading: deleting }] = useMutation(DELETE_MARKETING_CAMPAIGN);
  const { data: listsData } = useQuery<{ audienceLists: CampaignAudienceList[] }>(
    AUDIENCE_LISTS_FOR_CAMPAIGN,
    { fetchPolicy: 'cache-and-network' },
  );

  const fetchRows = useApolloTableFetch<MarketingCampaignRow>(
    client,
    MARKETING_CAMPAIGNS_TABLE,
    'marketingCampaignsTable',
  );

  const busy = sending || deleting;

  const openCampaign = useCallback((row: MarketingCampaignRow) => setViewing(row.campaign_id), []);

  const handleSend = useCallback(
    async (row: MarketingCampaignRow) => {
      try {
        const result = await sendCampaign({ variables: { campaign_id: row.campaign_id } });
        const sent = result.data?.sendMarketingCampaign;
        if (sent?.error) notifyError(sent.error);
        else notifySuccess('Campaign sent');
      } catch (e) {
        notifyError(parseApiError(e, 'Campaign send failed'));
        return;
      }
      refetchRef.current?.();
    },
    [sendCampaign],
  );

  const confirmDelete = async (row: MarketingCampaignRow) => {
    setError(null);
    try {
      await deleteCampaign({ variables: { campaign_id: row.campaign_id } });
    } catch (e) {
      setError(parseApiError(e, 'Could not delete the campaign'));
      return;
    }
    notifySuccess(`“${row.name}” deleted`);
    setTarget(null);
    setViewing(null);
    refetchRef.current?.();
  };

  const closeConfirm = () => {
    setTarget(null);
    setError(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={2}>
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Marketing Campaigns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Every email campaign you have sent or scheduled. Open one to see the email exactly as it
            went out.
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/campaigns/email/new')}
        >
          New campaign
        </Button>
      </Stack>

      <CampaignTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        busy={busy}
        onView={openCampaign}
        onSend={handleSend}
        onDelete={setTarget}
      />

      <CampaignDetailsDialog
        campaignId={viewing}
        audienceLists={listsData?.audienceLists ?? []}
        busy={busy}
        formatDateTime={formatDateTime}
        onClose={() => setViewing(null)}
        onSend={handleSend}
        onDelete={setTarget}
      />

      {/* Rendered only once a campaign is picked, so confirming needs no null
          guard for a state the dialog cannot be open in. */}
      {target && (
        <ConfirmDialog
          open
          title="Delete this campaign?"
          message={error ?? deleteWarningFor(target)}
          confirmLabel="Delete"
          confirmColor="error"
          loading={deleting}
          busyLabel="Deleting…"
          onClose={closeConfirm}
          onConfirm={() => confirmDelete(target)}
        />
      )}
    </Box>
  );
}
