import { useMemo, useState, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import WaCampaignDetailDialog from '../wa-campaign-detail';
import AutoLogDetail from './AutoLogDetail';
import { getLogColumns } from './logColumns';
import { useWaCurrency } from '../useWaCurrency';
import { WA_LOGS, type WaAudienceList, type WaCampaignRow, type WaLogRow } from '../queries';
import type { useWaCampaignActions } from '../useWaCampaignActions';

/** Campaign ids and message log ids come from different collections, so the
 * kind is part of the row's identity rather than an assumption about them. */
const getRowId = (row: WaLogRow) => `${row.kind}-${row.id}`;

interface Props {
  audienceLists: WaAudienceList[];
  actions: ReturnType<typeof useWaCampaignActions>;
  /** Start a new send prefilled from a past one. */
  onDuplicate: (campaign: WaCampaignRow) => void;
  /** Filled with a "reload the table" fn so a send elsewhere refreshes it. */
  refetchRef: MutableRefObject<(() => void) | null>;
  /**
   * Show only the sends made on these AiSensy campaigns.
   *
   * It arrives from the URL, which is what a Sent count on the Campaigns or
   * Templates tab writes — so the narrowed view survives a reload and can be
   * pasted to somebody else. Empty means the whole feed.
   */
  campaigns: readonly string[];
  /** Drops the narrowing and shows everything again. */
  onClearCampaigns: () => void;
}

/**
 * Every WhatsApp send that has been made, in one table.
 *
 * Campaign sends and the messages the platform sends by itself used to be two
 * records behind a toggle, which meant "why didn't this person get it" had to
 * be asked twice and answered in whichever half you happened to be looking at.
 * The server flattens both onto one shape, so this is one feed — and everything
 * that differs between the two lives BEHIND a row rather than as a column that
 * is blank on half the table.
 *
 * It is the record, not the place a send starts: sending begins from the
 * campaign you are looking at, under Campaigns.
 */
export default function WaLogs({
  audienceLists,
  actions,
  onDuplicate,
  refetchRef,
  campaigns,
  onClearCampaigns,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();
  const currency = useWaCurrency();
  const [opened, setOpened] = useState<WaLogRow | null>(null);
  const [target, setTarget] = useState<WaCampaignRow | null>(null);

  const fetchRows = useApolloTableFetch<WaLogRow>(client, WA_LOGS, 'waLogs');
  // `in` over the whole list rather than a filter per name: a template is sent
  // by however many campaigns point at it, and its count covers all of them.
  const externalFilters = useMemo(
    () =>
      campaigns.length > 0
        ? [{ field: 'campaign', op: 'in' as const, values: [...campaigns] }]
        : [],
    [campaigns]
  );
  const columns = useMemo(
    () => getLogColumns({ t, formatDateTime, currency }),
    [t, formatDateTime, currency]
  );

  const confirmDelete = async () => {
    if (!target || !(await actions.remove(target))) return;
    // The detail view of a campaign that no longer exists has nothing to show.
    setOpened(null);
    setTarget(null);
  };

  const duplicate = (campaign: WaCampaignRow) => {
    setOpened(null);
    onDuplicate(campaign);
  };

  const campaignId = opened?.kind === 'CAMPAIGN' ? opened.id : null;
  const automaticId = opened?.kind === 'AUTOMATIC' ? opened.id : null;

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          {t('marketingWhatsapp.logs.title')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('marketingWhatsapp.logs.hint')}
        </Typography>
      </Stack>

      {campaigns.length > 0 && (
        <Alert
          severity="info"
          action={
            <DuncitButton size="small" onClick={onClearCampaigns}>
              {t('marketingWhatsapp.logs.showEverything')}
            </DuncitButton>
          }
        >
          {t('marketingWhatsapp.logs.narrowedTo', { vars: { campaigns: campaigns.join(', ') } })}
        </Alert>
      )}

      <DuncitTable<WaLogRow>
        tableId="wa-logs"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={setOpened}
        emptyText={t('marketingWhatsapp.logs.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('marketingWhatsapp.logs.search')}
        refetchRef={refetchRef}
        externalFilters={externalFilters}
      />

      <WaCampaignDetailDialog
        campaignId={campaignId}
        audienceLists={audienceLists}
        currency={currency}
        retrying={actions.retrying}
        cancelling={actions.cancelling}
        onRetry={actions.retry}
        onCancel={actions.cancel}
        onDelete={setTarget}
        onDuplicate={duplicate}
        onClose={() => setOpened(null)}
      />

      <AutoLogDetail
        logId={automaticId}
        currency={currency}
        onClose={() => setOpened(null)}
      />

      {target && (
        <ConfirmDialog
          open
          title={t('marketing.whatsappCampaigns.deleteThisSend')}
          message={t('marketingWhatsapp.logs.deleteMessage', { vars: { name: target.name } })}
          confirmLabel={t('shell.common.delete')}
          confirmColor="error"
          loading={actions.deleting}
          busyLabel={t('marketingWhatsapp.logs.deleting')}
          onClose={() => setTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Stack>
  );
}
