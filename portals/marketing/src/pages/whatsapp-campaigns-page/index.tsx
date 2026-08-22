import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import WaDashboard from './wa-dashboard';
import WaLogs from './wa-logs';
import WaSettings from './wa-settings';
import { WaTestForm } from './wa-test-form';
import AisensyCampaigns from './wa-aisensy/AisensyCampaigns';
import AisensyTemplates from './wa-aisensy/AisensyTemplates';
import type { CampaignRow } from './wa-aisensy/helpers';
import { WaCampaignForm, valuesFromCampaign, type WaCampaignValues } from './wa-campaign-form';
import { useWaCampaignActions } from './useWaCampaignActions';
import {
  WA_CAMPAIGN_SETUP,
  type WaAudienceList,
  type WaCampaignNameOption,
  type WaCampaignRow,
  type WaCampaignVariable,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

type WaTab = 'dashboard' | 'campaigns' | 'templates' | 'logs' | 'settings';

/* The order a question is usually asked in: what did this cost, what can I
   send, what do those templates say, what went out, and what does it cost. */
type Translate = ReturnType<typeof useTranslation>['t'];

const waTabs = (t: Translate): DuncitTabItem<WaTab>[] => [
  { value: 'dashboard', label: t('shell.nav.dashboard') },
  { value: 'campaigns', label: t('shell.nav.campaigns') },
  { value: 'templates', label: t('shell.nav.templates') },
  { value: 'logs', label: t('shell.nav.logs') },
  { value: 'settings', label: t('shell.nav.settings') },
];

interface SetupData {
  waCampaignConfigured: boolean;
  waCampaignNames: WaCampaignNameOption[];
  waCampaignVariables: WaCampaignVariable[];
  audienceLists: WaAudienceList[];
}

/**
 * WhatsApp: what it costs, what can be sent, what those templates say, and
 * everything that went out.
 *
 * A send starts from the campaign you are looking at under Campaigns — there is
 * no separate "new send" screen to pick the campaign again in. The API key is
 * not asked for here either; it comes from the Tech portal, server-side.
 */
export default function WhatsappCampaignsPage() {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const tabs = useTabParam<WaTab>({ items: waTabs(t), fallback: 'dashboard' });
  const tab = tabs.value;
  const [formOpen, setFormOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [prefill, setPrefill] = useState<WaCampaignValues | null>(null);
  const [sendFor, setSendFor] = useState('');

  const { data, refetch } = useQuery<SetupData>(WA_CAMPAIGN_SETUP, {
    fetchPolicy: 'cache-and-network',
  });

  const onChanged = useCallback(() => {
    refetch().catch(() => undefined);
    refetchRef.current?.();
  }, [refetch]);

  const actions = useWaCampaignActions(onChanged);
  const configured = data?.waCampaignConfigured !== false;

  /** Send this campaign: the form opens already pointed at it. */
  const startSend = useCallback((campaign: CampaignRow) => {
    setPrefill(null);
    setSendFor(campaign.name);
    setFormOpen(true);
  }, []);

  const startTest = useCallback((campaign: CampaignRow) => {
    setSendFor(campaign.name);
    setTestOpen(true);
  }, []);

  /** Repeat a past send: the form opens carrying it, and the original is left
   * exactly as it was. */
  const duplicate = (campaign: WaCampaignRow) => {
    setPrefill(valuesFromCampaign(campaign));
    setSendFor(campaign.wa_campaign_name);
    setFormOpen(true);
  };

  const submit = async (input: Parameters<typeof actions.send>[0]) => {
    const ok = await actions.send(input);
    if (ok) setFormOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={0.25} mb={2}>
        <Typography variant="h5" fontWeight={700}>
          WhatsApp
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Send an approved WhatsApp template to an audience, a few people or a list of numbers.
          Recipients come from what you pick; the AiSensy API key comes from the Tech portal.
        </Typography>
      </Stack>

      <DuncitTabs {...tabs} sx={{ mb: 2 }} />

      {!configured && tab !== 'settings' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No AiSensy API key yet — add one in the Tech portal under Environment Variables → AiSensy
          before sending.
        </Alert>
      )}

      {tab === 'dashboard' && <WaDashboard />}
      {tab === 'campaigns' && (
        <AisensyCampaigns
          names={data?.waCampaignNames ?? []}
          onSend={startSend}
          onTest={startTest}
        />
      )}
      {tab === 'templates' && <AisensyTemplates />}
      {tab === 'logs' && (
        <WaLogs
          audienceLists={data?.audienceLists ?? []}
          actions={actions}
          onDuplicate={duplicate}
          refetchRef={refetchRef}
        />
      )}
      {tab === 'settings' && (
        <WaSettings
          names={data?.waCampaignNames ?? []}
          namesBusy={actions.namesBusy}
          onAddName={actions.addName}
          onDeleteName={actions.removeName}
        />
      )}

      <WaCampaignForm
        open={formOpen}
        busy={actions.sending}
        initial={prefill}
        campaignName={sendFor}
        names={data?.waCampaignNames ?? []}
        audienceLists={data?.audienceLists ?? []}
        variables={data?.waCampaignVariables ?? []}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
      />

      <WaTestForm
        open={testOpen}
        busy={actions.testing}
        campaignName={sendFor}
        names={data?.waCampaignNames ?? []}
        onClose={() => setTestOpen(false)}
        onSubmit={actions.testMessage}
      />
    </Box>
  );
}
