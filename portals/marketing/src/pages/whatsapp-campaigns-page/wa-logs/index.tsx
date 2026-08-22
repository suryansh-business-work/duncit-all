import { useState, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import WaCampaignTable from '../WaCampaignTable';
import WaCampaignDetailDialog from '../wa-campaign-detail';
import WaAutoLogsTable from './WaAutoLogsTable';
import { useWaCurrency } from '../useWaCurrency';
import { WA_CAMPAIGNS_TABLE, type WaAudienceList, type WaCampaignRow } from '../queries';
import type { useWaCampaignActions } from '../useWaCampaignActions';

/** The two records this tab holds: sends somebody started, and sends the
 * platform made on its own. */
type LogView = 'campaigns' | 'automatic';

interface Props {
  audienceLists: WaAudienceList[];
  actions: ReturnType<typeof useWaCampaignActions>;
  /** Start a new send prefilled from a past one. */
  onDuplicate: (campaign: WaCampaignRow) => void;
  /** Filled with a "reload the table" fn so a send elsewhere refreshes it. */
  refetchRef: MutableRefObject<(() => void) | null>;
}

/**
 * Every send that has been made: what it cost, who it reached, and who it did
 * not. This is the record, not the place a send starts — sending begins from
 * the campaign you are looking at, under Campaigns. The automatic view is the
 * same record for the messages the platform sends by itself, because this tab
 * is where "why didn't this person get it" is asked.
 */
export default function WaLogs({ audienceLists, actions, onDuplicate, refetchRef }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const currency = useWaCurrency();
  const [view, setView] = useState<LogView>('campaigns');
  const [viewing, setViewing] = useState<string | null>(null);
  const [target, setTarget] = useState<WaCampaignRow | null>(null);
  const fetchRows = useApolloTableFetch<WaCampaignRow>(
    client,
    WA_CAMPAIGNS_TABLE,
    'waCampaignsTable'
  );

  const confirmDelete = async () => {
    if (!target || !(await actions.remove(target))) return;
    // The detail view of a campaign that no longer exists has nothing to show.
    setViewing((id) => (id === target.campaign_id ? null : id));
    setTarget(null);
  };

  const duplicate = (campaign: WaCampaignRow) => {
    setViewing(null);
    onDuplicate(campaign);
  };

  return (
    <Stack spacing={1.5}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={view}
        onChange={(_e, value) => {
          if (value !== null) setView(value as LogView);
        }}
      >
        <ToggleButton value="campaigns">{t('marketingWhatsapp.autoLogs.toggleCampaigns')}</ToggleButton>
        <ToggleButton value="automatic">{t('marketingWhatsapp.autoLogs.toggleAutomatic')}</ToggleButton>
      </ToggleButtonGroup>

      {view === 'campaigns' && (
        <>
          <Typography variant="body2" color="text.secondary">
            Every send, with what it cost. Cost is the rate that send froze times the messages that
            actually went out — skipped and failed people were never billed.
          </Typography>

          <WaCampaignTable
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            currency={currency}
            busy={actions.cancelling}
            onOpen={(row) => setViewing(row.campaign_id)}
            onCancel={actions.cancel}
            onDelete={setTarget}
          />

          <WaCampaignDetailDialog
            campaignId={viewing}
            audienceLists={audienceLists}
            currency={currency}
            retrying={actions.retrying}
            onRetry={actions.retry}
            onDuplicate={duplicate}
            onClose={() => setViewing(null)}
          />

          {target && (
            <ConfirmDialog
              open
              title={t('marketing.whatsappCampaigns.deleteThisSend')}
              message={`“${target.name}” and its results will be removed. Messages already delivered are not recalled.`}
              confirmLabel={t('shell.common.delete')}
              confirmColor="error"
              loading={actions.deleting}
              busyLabel="Deleting…"
              onClose={() => setTarget(null)}
              onConfirm={confirmDelete}
            />
          )}
        </>
      )}

      {view === 'automatic' && (
        <>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              {t('marketingWhatsapp.autoLogs.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('marketingWhatsapp.autoLogs.hint')}
            </Typography>
          </Stack>
          <WaAutoLogsTable />
        </>
      )}
    </Stack>
  );
}
