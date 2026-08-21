import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useApolloTableFetch } from '@duncit/table';
import OpenAiLogsTable from './OpenAiLogsTable';
import OpenAiLogDrawer from './OpenAiLogDrawer';
import {
  OPENAI_LOGS_TABLE,
  OPENAI_TASK_CATALOGUE,
  type OpenAiLogRow,
  type TaskCatalogue,
} from './queries';

/**
 * OpenAI Logs — one row per request, including the ones that never left.
 *
 * The rows worth having here are the failures: a model that returned nothing, a
 * key that was never configured, a scan that quietly fell back to its heuristic.
 * Those calls have no record anywhere else — OpenAI never saw them — and they
 * are exactly what "the AI review didn't run" turns out to be.
 */
export default function OpenAiLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<OpenAiLogRow>(client, OPENAI_LOGS_TABLE, 'openAiUsageLogsTable');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data } = useQuery<{ openAiTaskCatalogue: TaskCatalogue }>(OPENAI_TASK_CATALOGUE, {
    fetchPolicy: 'cache-first',
  });

  // Filter options are the server's catalogue, so a task added on the server
  // becomes filterable without a portal release.
  const taskOptions = useMemo(
    () => (data?.openAiTaskCatalogue.tasks ?? []).map((t) => ({ value: t.key, label: t.label })),
    [data]
  );
  const moduleOptions = useMemo(
    () => (data?.openAiTaskCatalogue.modules ?? []).map((m) => ({ value: m, label: m })),
    [data]
  );

  const openRow = useCallback((row: OpenAiLogRow) => setOpenId(row.id), []);
  const closeRow = useCallback(() => setOpenId(null), []);

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('ai.openAiLogs.title')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('ai.openAiLogs.subtitle')}
        </Typography>
      </Stack>

      <OpenAiLogsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={openRow}
        taskOptions={taskOptions}
        moduleOptions={moduleOptions}
      />
      <OpenAiLogDrawer logId={openId} onClose={closeRow} />
    </Box>
  );
}
