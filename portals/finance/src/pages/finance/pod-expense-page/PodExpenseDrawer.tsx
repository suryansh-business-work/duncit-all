import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Divider, Drawer } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import PodExpensePodHeader from './PodExpensePodHeader';
import PodExpenseEntriesTable from './PodExpenseEntriesTable';
import PodExpenseForm, { toPodExpenseInput, type PodExpenseFormValues } from './pod-expense-form';
import {
  CREATE_POD_EXPENSE,
  DELETE_POD_EXPENSE,
  POD_EXPENSE_POD_SUMMARY,
  UPDATE_POD_EXPENSE,
  type PodExpensePodRow,
  type PodExpenseRow,
} from './queries';

interface Props {
  /** The row that was clicked; null keeps the drawer closed. */
  seedPod: PodExpensePodRow | null;
  currency: string;
  onClose: () => void;
  /** Refresh the pods list + KPI tiles after anything is written. */
  onSaved: () => void;
}

/**
 * The side panel a pod row opens: its recorded spend, and the form that adds
 * to it. The form replaces the list rather than sitting under it — a drawer
 * showing both at once puts the submit button below a paginated table.
 *
 * The header reads the pod back from the server rather than trusting the row
 * that opened it: the seed row is a snapshot from the list, and it is exactly
 * the running total that a save is supposed to move.
 */
export default function PodExpenseDrawer({ seedPod, currency, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const entriesRefetch = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<PodExpenseRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PodExpenseRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [create, createState] = useMutation<any>(CREATE_POD_EXPENSE);
  const [update, updateState] = useMutation<any>(UPDATE_POD_EXPENSE);
  const [remove, removeState] = useMutation<any>(DELETE_POD_EXPENSE);
  const saving = createState.loading || updateState.loading;

  const podDocId = seedPod?.pod_doc_id ?? null;
  const summaryQuery = useQuery<{ podExpensePodSummary: PodExpensePodRow | null }>(
    POD_EXPENSE_POD_SUMMARY,
    {
      variables: { pod_doc_id: podDocId },
      skip: !podDocId,
      fetchPolicy: 'cache-and-network',
    },
  );
  // Only trust the fetched pod when it IS this pod — a cached answer for the
  // previously opened row would otherwise flash in the header.
  const fetched = summaryQuery.data?.podExpensePodSummary;
  const pod = fetched?.pod_doc_id === podDocId ? fetched : seedPod;

  // A different pod means a different ledger: never carry an open form over.
  useEffect(() => {
    setFormOpen(false);
    setEditing(null);
    setPendingDelete(null);
    setError(null);
  }, [podDocId]);

  const refetchSummary = summaryQuery.refetch;
  const afterWrite = useCallback(() => {
    entriesRefetch.current?.();
    refetchSummary().catch((e) =>
      logs.portal.finance.warn('PodExpenseDrawer', 'afterWrite', {
        error: e,
        msg: 'Pod expense header refresh failed',
      }),
    );
    onSaved();
  }, [onSaved, refetchSummary]);

  const openNew = () => {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  };
  const openEdit = useCallback((row: PodExpenseRow) => {
    setEditing(row);
    setError(null);
    setFormOpen(true);
  }, []);
  const askDelete = useCallback((row: PodExpenseRow) => setPendingDelete(row), []);

  // Both writes take the thing they act on as an argument rather than reading
  // it back out of state: each is only ever rendered inside the branch that
  // already proved it is there, so a re-check here could only ever be dead.
  const submit = async (values: PodExpenseFormValues, podId: string) => {
    setError(null);
    const input = toPodExpenseInput(values);
    try {
      if (editing) await update({ variables: { expense_doc_id: editing.id, input } });
      else await create({ variables: { pod_doc_id: podId, input } });
      setFormOpen(false);
      setEditing(null);
      afterWrite();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const confirmDelete = async (row: PodExpenseRow) => {
    try {
      await remove({ variables: { expense_doc_id: row.id } });
      setPendingDelete(null);
      afterWrite();
    } catch (e) {
      setPendingDelete(null);
      setError(parseApiError(e));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={!!seedPod}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 560, lg: 760 }, p: 2.5 } }
      }}
    >
      {pod && podDocId && (
        <>
          <PodExpensePodHeader pod={pod} currency={currency} onClose={onClose} />
          <Divider sx={{ mb: 2 }} />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {formOpen ? (
            <PodExpenseForm
              expense={editing}
              currency={currency}
              busy={saving}
              onCancel={() => setFormOpen(false)}
              onSubmit={(values) => submit(values, podDocId)}
            />
          ) : (
            <Box>
              <PodExpenseEntriesTable
                podDocId={podDocId}
                currency={currency}
                refetchRef={entriesRefetch}
                onEdit={openEdit}
                onDelete={askDelete}
                toolbarActions={
                  <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                    {t('finance.podExpense.addExpense')}
                  </DuncitButton>
                }
              />
            </Box>
          )}
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          destructive
          busy={removeState.loading}
          title={t('finance.podExpense.deleteExpense')}
          message={t('finance.podExpense.deleteExpenseConfirm')}
          confirmLabel={t('shell.common.delete')}
          onConfirm={() => confirmDelete(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </Drawer>
  );
}
