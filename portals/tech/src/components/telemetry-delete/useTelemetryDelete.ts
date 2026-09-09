import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  DELETE_TELEMETRY_RECORDS,
  TELEMETRY_DELETE_COUNT,
  type TelemetryDeleteScope,
  type TelemetryDeleteTarget,
} from './queries';

interface CountResult {
  telemetryDeleteCount: number;
}

/**
 * How many rows a scope covers, asked of the SERVER rather than inferred.
 *
 * The grid only ever holds one page, so it cannot answer "how many match this
 * view" for the pages nobody has opened — and that is exactly the number a
 * filtered delete has to state before it runs.
 */
export function useTelemetryDeleteCount(
  target: TelemetryDeleteTarget,
  scope: TelemetryDeleteScope,
  skip: boolean,
) {
  const { data, loading, error } = useQuery<CountResult>(TELEMETRY_DELETE_COUNT, {
    variables: { target, scope },
    skip,
    fetchPolicy: 'network-only',
  });
  return { count: data?.telemetryDeleteCount ?? 0, loading, error };
}

interface RunResult {
  deleteTelemetryRecords: number;
}

/**
 * Run one delete and report what the SERVER said went, never what was asked
 * for: a row that aged out of the retention window between the count and the
 * click is a row the number has to stop claiming.
 */
export function useRunTelemetryDelete(target: TelemetryDeleteTarget, onDeleted: () => void) {
  const { t } = useTranslation();
  const [mutate, { loading }] = useMutation<RunResult>(DELETE_TELEMETRY_RECORDS);

  const run = useCallback(
    async (scope: TelemetryDeleteScope) => {
      try {
        const res = await mutate({ variables: { target, scope } });
        const gone = res.data?.deleteTelemetryRecords ?? 0;
        notify(t('tech.telemetryDelete.deleted', { count: gone }), 'success');
        onDeleted();
      } catch (err) {
        notify(parseApiError(err), 'error');
      }
    },
    [mutate, target, onDeleted, t],
  );

  return { run, running: loading };
}
