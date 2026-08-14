import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import ErrorLogsTable from './ErrorLogsTable';
import ErrorLogDetailDialog from './ErrorLogDetailDialog';
import { ERROR_LOGS_TABLE, ERROR_MODULE_FILTER, type ErrorLogRow } from './queries';

/**
 * Error Logs — every server-operation failure the shared error module caught,
 * across the portals, mWeb and the native app, with the parsed GraphQL detail
 * (kind, code, operation, path) each row carried in with it.
 */
export default function ErrorLogsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<ErrorLogRow | null>(null);
  const fetchRows = useApolloTableFetch<ErrorLogRow>(client, ERROR_LOGS_TABLE, 'telemetryLogsTable');

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Error Logs</Typography>
        <Typography variant="body2" color="text.secondary">
          Server-operation failures caught by the shared error module on every surface — parsed
          GraphQL code, operation and path included. Rows follow the telemetry retention window.
        </Typography>
      </Box>
      <ErrorLogsTable fetchRows={fetchRows} refetchRef={refetchRef} onOpen={setSelected} />
      <ErrorLogDetailDialog row={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
