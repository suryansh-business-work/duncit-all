import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Alert, Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ScienceIcon from '@mui/icons-material/Science';
import TuneIcon from '@mui/icons-material/Tune';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTabParam } from '@duncit/ui';
import WaCampaignTable from './WaCampaignTable';
import CampaignNamesDialog from './CampaignNamesDialog';
import WaCampaignDetailDialog from './wa-campaign-detail';
import { WaTestForm } from './wa-test-form';
import AisensyCampaigns from './wa-aisensy/AisensyCampaigns';
import AisensyTemplates from './wa-aisensy/AisensyTemplates';
import { WaCampaignForm, valuesFromCampaign, type WaCampaignValues } from './wa-campaign-form';
import { useWaCampaignActions } from './useWaCampaignActions';
import {
  WA_CAMPAIGNS_TABLE,
  WA_CAMPAIGN_SETUP,
  type WaAudienceList,
  type WaCampaignNameOption,
  type WaCampaignRow,
  type WaCampaignVariable,
} from './queries';

type WaTab = 'sends' | 'campaigns' | 'templates';
const WA_TABS: WaTab[] = ['sends', 'campaigns', 'templates'];

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
  const [tab, setTab] = useTabParam<WaTab>({ values: WA_TABS, fallback: 'sends' });
  const [formOpen, setFormOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<WaCampaignValues | null>(null);
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

  /** Repeat a past send: the form opens carrying it, and the original is left
   * exactly as it was. */
  const duplicate = (campaign: WaCampaignRow) => {
    setPrefill(valuesFromCampaign(campaign));
    setViewing(null);
    setFormOpen(true);
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
        {tab === 'sends' && (
          <>
            <Button startIcon={<TuneIcon />} onClick={() => setNamesOpen(true)}>
              Manage names
            </Button>
            <Button
              startIcon={<ScienceIcon />}
              disabled={!configured}
              onClick={() => setTestOpen(true)}
            >
              Send test
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!configured}
              onClick={() => {
                setPrefill(null);
                setFormOpen(true);
              }}
            >
              New campaign
            </Button>
          </>
        )}
      </Stack>

      {/* Three sections, three questions: what have we sent, what can we send
          against, and what do those templates actually say. */}
      <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ mb: 2 }}>
        <Tab value="sends" label="Sends" />
        <Tab value="campaigns" label="Campaigns" />
        <Tab value="templates" label="Templates" />
      </Tabs>

      {tab === 'sends' && !configured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No AiSensy API key yet — add one in the Tech portal under Environment Variables → AiSensy
          before sending.
        </Alert>
      )}

      {tab === 'sends' && (
        <WaCampaignTable
          fetchRows={fetchRows}
          refetchRef={refetchRef}
          busy={actions.cancelling}
          onOpen={(row) => setViewing(row.campaign_id)}
          onCancel={actions.cancel}
          onDelete={setTarget}
        />
      )}
      {tab === 'campaigns' && <AisensyCampaigns />}
      {tab === 'templates' && <AisensyTemplates />}

      <WaCampaignDetailDialog
        campaignId={viewing}
        audienceLists={data?.audienceLists ?? []}
        retrying={actions.retrying}
        onRetry={actions.retry}
        onDuplicate={duplicate}
        onClose={() => setViewing(null)}
      />

      <WaCampaignForm
        open={formOpen}
        busy={actions.sending}
        initial={prefill}
        names={data?.waCampaignNames ?? []}
        audienceLists={data?.audienceLists ?? []}
        variables={data?.waCampaignVariables ?? []}
        onClose={() => setFormOpen(false)}
        onManageNames={() => setNamesOpen(true)}
        onSubmit={submit}
      />

      <WaTestForm
        open={testOpen}
        busy={actions.testing}
        names={data?.waCampaignNames ?? []}
        onClose={() => setTestOpen(false)}
        onSubmit={actions.testMessage}
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
