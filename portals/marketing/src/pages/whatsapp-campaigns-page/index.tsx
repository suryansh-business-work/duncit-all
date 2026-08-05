import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import WaCampaignTable from './WaCampaignTable';
import CampaignNamesDialog from './CampaignNamesDialog';
import WaCampaignDetailDialog from './wa-campaign-detail';
import { WaCampaignForm } from './wa-campaign-form';
import { useWaCampaignActions } from './useWaCampaignActions';
import {
  WA_CAMPAIGNS_TABLE,
  WA_CAMPAIGN_SETUP,
  type WaAudienceList,
  type WaCampaignNameOption,
  type WaCampaignRow,
  type WaCampaignVariable,
} from './queries';

interface SetupData {
  waCampaignConfigured: boolean;
  waCampaignNames: WaCampaignNameOption[];
  waCampaignVariables: WaCampaignVariable[];
  audienceLists: WaAudienceList[];
}

/**
 * WhatsApp campaigns: pick an approved AiSensy template, point it at a Target
 * Audience, and send. The API key is not asked for here — it comes from the
 * Tech portal's AiSensy entry, server-side, per send.
 */
export default function WhatsappCampaignsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [target, setTarget] = useState<WaCampaignRow | null>(null);

  const { data, refetch } = useQuery<SetupData>(WA_CAMPAIGN_SETUP, {
    fetchPolicy: 'cache-and-network',
  });

  const onChanged = useCallback(() => {
    refetch().catch(() => undefined);
    refetchRef.current?.();
  }, [refetch]);

  const actions = useWaCampaignActions(onChanged);
  const fetchRows = useApolloTableFetch<WaCampaignRow>(
    client,
    WA_CAMPAIGNS_TABLE,
    'waCampaignsTable'
  );

  const configured = data?.waCampaignConfigured !== false;

  const submit = async (input: Parameters<typeof actions.send>[0]) => {
    const ok = await actions.send(input);
    if (ok) setFormOpen(false);
  };

  const confirmDelete = async () => {
    if (!target || !(await actions.remove(target))) return;
    // The detail view of a campaign that no longer exists has nothing to show.
    setViewing((id) => (id === target.campaign_id ? null : id));
    setTarget(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={2}>
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            WhatsApp Campaigns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Send an approved WhatsApp template to a Target Audience. Recipients and their names
            come from the audience; the AiSensy API key comes from the Tech portal.
          </Typography>
        </Stack>
        <Button startIcon={<TuneIcon />} onClick={() => setNamesOpen(true)}>
          Manage names
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!configured}
          onClick={() => setFormOpen(true)}
        >
          New campaign
        </Button>
      </Stack>

      {!configured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No AiSensy API key yet — add one in the Tech portal under Environment Variables → AiSensy
          before sending.
        </Alert>
      )}

      <WaCampaignTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onOpen={(row) => setViewing(row.campaign_id)}
        onDelete={setTarget}
      />

      <WaCampaignDetailDialog
        campaignId={viewing}
        audienceLists={data?.audienceLists ?? []}
        onClose={() => setViewing(null)}
      />

      <WaCampaignForm
        open={formOpen}
        busy={actions.sending}
        names={data?.waCampaignNames ?? []}
        audienceLists={data?.audienceLists ?? []}
        variables={data?.waCampaignVariables ?? []}
        onClose={() => setFormOpen(false)}
        onManageNames={() => setNamesOpen(true)}
        onSubmit={submit}
      />

      <CampaignNamesDialog
        open={namesOpen}
        busy={actions.namesBusy}
        names={data?.waCampaignNames ?? []}
        onClose={() => setNamesOpen(false)}
        onAdd={actions.addName}
        onDelete={actions.removeName}
      />

      {target && (
        <ConfirmDialog
          open
          title="Delete this campaign?"
          message={`“${target.name}” and its send results will be removed. Messages already delivered are not recalled.`}
          confirmLabel="Delete"
          confirmColor="error"
          loading={actions.deleting}
          busyLabel="Deleting…"
          onClose={() => setTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Box>
  );
}
