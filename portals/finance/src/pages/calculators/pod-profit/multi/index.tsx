import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import MultiPodEditor from './MultiPodEditor';
import SavedCalculatorsTable from '../saved/SavedCalculatorsTable';
import { CREATE_POD_CALCULATOR, POD_CALCULATORS } from '../saved/queries';
import { useOpenParam } from '../saved/useOpenParam';
import { newEntry, podPayload, type SavedPodCalculator } from '../saved/types';

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
  const [openId, setOpen] = useOpenParam(OPEN_PARAM);

  const { data, loading, error, refetch } = useQuery<any>(POD_CALCULATORS, {
    variables: { kind: 'MULTI' },
    fetchPolicy: 'cache-and-network',
  });
  const [create, createState] = useMutation<any>(CREATE_POD_CALCULATOR);

  const rows: SavedPodCalculator[] = data?.podCalculators ?? [];
  const open = rows.find((row) => row.id === openId) ?? null;


  const onCreate = () => {
    create({
      variables: {
        input: {
          name: t('finance.calculators.untitledComparison'),
          kind: 'MULTI',
          // One pod to start from, so the editor opens on something to edit
          // rather than an empty list.
          pods: podPayload([newEntry(t('finance.common.pod'), 1)]),
        },
      },
    })
      .then((res) => {
        const created = res.data?.createPodCalculator;
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
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('finance.calculators.savedComparisonsIntro')}
      </Typography>
      <SavedCalculatorsTable
        kind="MULTI"
        rows={rows}
        emptyText={t('finance.calculators.noComparisonsYet')}
        onOpen={setOpen}
        toolbarActions={
          <DuncitButton
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onCreate}
            disabled={createState.loading}
          >
            {t('finance.calculators.newComparison')}
          </DuncitButton>
        }
      />
    </Stack>
  );
}
