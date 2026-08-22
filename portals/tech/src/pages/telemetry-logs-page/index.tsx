import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import LogsTable from './LogsTable';
import LogDetailDialog from './LogDetailDialog';
import LogImportExport from './LogImportExport';
import {
  LEVEL_TABS,
  TELEMETRY_LOGS_TABLE,
  type TelemetryLevel,
  type TelemetryLogRow,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

const TAB_ITEMS = LEVEL_TABS.map((tab) => ({ value: tab.value, label: tab.label }));

/**
 * Telemetry Logs — one table per level, each with its own export, import and
 * no-login JSON URL.
 *
 * Four tables rather than one filtered table because they are read for four
 * different reasons: `error` is triage, `warn` is a trend, `info` is an audit
 * trail and `debug` is only ever read while chasing one thing. Each keeps its
 * own column layout and its own file, and the open tab is in the URL so a
 * pasted link lands where it was sent from.
 */
export default function TelemetryLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<TelemetryLogRow | null>(null);
  const tabs = useTabParam<TelemetryLevel>({ items: TAB_ITEMS, fallback: 'error' });
  const fetchRows = useApolloTableFetch<TelemetryLogRow>(
    client,
    TELEMETRY_LOGS_TABLE,
    'telemetryLogsTable',
  );
  const refetch = useCallback(() => refetchRef.current?.(), []);

  const active = LEVEL_TABS.find((tab) => tab.value === tabs.value) ?? LEVEL_TABS[0];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{t('tech.telemetryLogs.telemetryLogs')}</Typography>
        <Typography variant="body2" color="text.secondary">
          Every persisted log, split by level, with the account, device and build behind each one.
          Only the levels selected in Logs Settings are stored, and rows leave when the retention
          window ends.
        </Typography>
      </Box>

      <DuncitTabs {...tabs} items={TAB_ITEMS} variant="scrollable" allowScrollButtonsMobile />

      <Typography variant="body2" color="text.secondary">
        {active.blurb}
      </Typography>

      {/* Keyed per level: the four tabs render the same component shape, so
          without a key React reconciles in place and the table would keep the
          previous level's rows, column prefs and query state. */}
      <LogsTable
        key={tabs.value}
        level={tabs.value}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onOpen={setSelected}
        toolbarActions={<LogImportExport level={tabs.value} onImported={refetch} />}
      />

      <LogDetailDialog row={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
