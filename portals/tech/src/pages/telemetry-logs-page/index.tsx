import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useUserData } from '@duncit/user-context';
import { SUPER_ROLE } from '../../lib/session';
import {
  TelemetryBulkBar,
  TelemetryDeleteButton,
  useTelemetryTableSelection,
} from '../../components/telemetry-delete';
import LogsTable from './LogsTable';
import LogImportExport from './LogImportExport';
import {
  LEVEL_TABS,
  TELEMETRY_LOGS_TABLE,
  type TelemetryLevel,
  type TelemetryLogRow,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

const TAB_ITEMS = LEVEL_TABS.map((tab) => ({ value: tab.value, label: tab.label }));
const rowId = (row: TelemetryLogRow) => row.id;

/**
 * Telemetry Logs — one table per level, each with its own export, import and
 * no-login JSON URL.
 *
 * Four tables rather than one filtered table because they are read for four
 * different reasons: `error` is triage, `warn` is a trend, `info` is an audit
 * trail and `debug` is only ever read while chasing one thing. Each keeps its
 * own column layout and its own file, and the open tab is in the URL so a
 * pasted link lands where it was sent from.
 *
 * A row opens at its own address rather than in a dialog over the table, for
 * the same reason: the log is what gets pasted to whoever has to fix it.
 *
 * The level is a PINNED filter, so it rides along in the delete scope too: a
 * "delete everything matching this view" on the debug tab is a debug-only
 * delete, and there is no gesture here that reaches the other three.
 */
export default function TelemetryLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const { user } = useUserData();
  const tabs = useTabParam<TelemetryLevel>({ items: TAB_ITEMS, fallback: 'error' });
  const bulk = useTelemetryTableSelection<TelemetryLogRow>(rowId);
  const fetchRows = useApolloTableFetch<TelemetryLogRow>(
    client,
    TELEMETRY_LOGS_TABLE,
    'telemetryLogsTable',
  );
  const openLog = useCallback(
    (row: TelemetryLogRow) => navigate(`/telemetry/log/${row.id}`),
    [navigate],
  );

  const active = LEVEL_TABS.find((tab) => tab.value === tabs.value) ?? LEVEL_TABS[0];
  const isSuperAdmin = user?.roles?.includes(SUPER_ROLE) ?? false;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{t('tech.telemetryLogs.telemetryLogs')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Every persisted log, split by level, with the account, device and build behind each one.
          Only the levels selected in Logs Settings are stored, and rows leave when the retention
          window ends.
        </Typography>
      </Box>

      <DuncitTabs {...tabs} items={TAB_ITEMS} variant="scrollable" allowScrollButtonsMobile />

      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {active.blurb}
      </Typography>

      <TelemetryBulkBar
        target="LOGS"
        selectedIds={bulk.selectedIds}
        view={bulk.view}
        onClear={bulk.clear}
        onDeleted={bulk.afterDelete}
      />

      {/* Keyed per level: the four tabs render the same component shape, so
          without a key React reconciles in place and the table would keep the
          previous level's rows, column prefs and query state. */}
      <LogsTable
        key={tabs.value}
        level={tabs.value}
        fetchRows={fetchRows}
        refetchRef={bulk.refetchRef}
        onOpen={openLog}
        selection={bulk.selection}
        onQueryChange={bulk.onQueryChange}
        toolbarActions={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <LogImportExport level={tabs.value} onImported={bulk.refetch} />
            <TelemetryDeleteButton
              target="LOGS"
              view={bulk.view}
              canDeleteEverything={isSuperAdmin}
              onDeleted={bulk.afterDelete}
            />
          </Stack>
        }
      />

    </Stack>
  );
}
