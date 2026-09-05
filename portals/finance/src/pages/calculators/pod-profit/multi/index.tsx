import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { DEFAULT_INPUTS } from '../types';
import MultiPodEditor from './MultiPodEditor';
import MultiPodList from './MultiPodList';
import { CREATE_MULTI_POD_CALCULATOR, MULTI_POD_CALCULATORS } from './queries';
import type { SavedMultiPodCalculator } from './types';

/** Which comparison is open. Its own query key, so it survives a reload and a
 * pasted link, and so the tab strip's `selectedtab` keeps its own meaning. */
const OPEN_PARAM = 'calculator';

/**
 * The Multiple pods tab: a table of every saved comparison, and the editor for
 * whichever one is open.
 *
 * The two are one route rather than two — a comparison is a row you click open
 * and close again, and `?calculator=` is what a reload reads to decide which
 * one you were looking at.
 */
export default function MultiPodCalculator() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const openId = params.get(OPEN_PARAM);

  const { data, loading, error, refetch } = useQuery<any>(MULTI_POD_CALCULATORS, {
    fetchPolicy: 'cache-and-network',
  });
  const [create, createState] = useMutation<any>(CREATE_MULTI_POD_CALCULATOR);

  const rows: SavedMultiPodCalculator[] = data?.multiPodCalculators ?? [];
  const open = rows.find((row) => row.id === openId) ?? null;

  const setOpen = useCallback(
    (id: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) {
            next.set(OPEN_PARAM, id);
          } else {
            next.delete(OPEN_PARAM);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const onCreate = () => {
    create({
      variables: {
        input: {
          name: t('finance.calculators.untitledComparison'),
          // One pod to start from, so the editor opens on something to edit
          // rather than an empty list.
          pods: [
            { pod_key: globalThis.crypto.randomUUID(), name: `${t('finance.common.pod')} 1`, ...DEFAULT_INPUTS },
          ],
        },
      },
    })
      .then((res) => {
        const created = res.data?.createMultiPodCalculator;
        return refetch().then(() => {
          if (created?.id) setOpen(created.id);
          return undefined;
        });
      })
      .catch((err: Error) => notifyError(err.message));
  };

  if (error) return <Alert severity="error">{error.message}</Alert>;

  if (loading && !data) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="rounded" height={44} />
        <Skeleton variant="rounded" height={220} />
      </Stack>
    );
  }

  // Keyed on the open row's id: switching comparisons remounts the editor, so
  // its state seeds from the row that was clicked instead of an effect trying
  // to copy new props over old state.
  if (open) {
    return (
      <MultiPodEditor
        key={open.id}
        saved={open}
        onClose={() => setOpen(null)}
        onSaved={() => {
          refetch().catch(() => undefined);
        }}
      />
    );
  }

  return (
    <MultiPodList
      rows={rows}
      creating={createState.loading}
      onCreate={onCreate}
      onOpen={setOpen}
    />
  );
}
