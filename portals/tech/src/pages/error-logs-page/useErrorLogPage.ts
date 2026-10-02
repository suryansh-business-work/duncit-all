import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useApolloTableFetch } from '@duncit/table';
import { useUserData } from '@duncit/user-context';
import { SUPER_ROLE } from '../../lib/session';
import { useTelemetryTableSelection } from '../../components/telemetry-delete';
import { getErrorRowId } from './errorLogCells';
import { ERROR_LOGS_TABLE, type ErrorLogRow } from './queries';

/**
 * What an error page runs on — Error Logs and Error Boundaries alike: the
 * telemetry rows, the row open in its dialog, the shared bulk delete, and
 * whether this person may delete everything.
 */
export function useErrorLogPage() {
  const client = useApolloClient();
  const { user } = useUserData();
  const [selected, setSelected] = useState<ErrorLogRow | null>(null);
  const bulk = useTelemetryTableSelection<ErrorLogRow>(getErrorRowId);
  const fetchRows = useApolloTableFetch<ErrorLogRow>(client, ERROR_LOGS_TABLE, 'telemetryLogsTable');
  const isSuperAdmin = user?.roles?.includes(SUPER_ROLE) ?? false;
  return { selected, setSelected, bulk, fetchRows, isSuperAdmin };
}
