import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Divider, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import ExpenseOptionTable from './ExpenseOptionTable';
import ExpenseOptionDialog from './ExpenseOptionDialog';
import {
  DELETE_EXPENSE_OPTION,
  EXPENSE_OPTIONS_TABLE,
  EXPENSE_OPTION_KINDS,
  KIND_LABEL_KEYS,
  type ExpenseOptionKind,
  type ExpenseOptionRow,
} from '../expense-config';

interface OptionsQueryData {
  expenseOptionsTable: ExpenseOptionRow[];
  expenseEntitySources: string[];
}

/**
 * Finance > Settings > Expense Settings.
 *
 * Every dropdown the Expense screens render is edited here. A tab per list,
 * because the four are independent — a category has nothing to say about a
 * compensation method — and because the tab lives in the URL, so a link to
 * "the compensation methods" is a link somebody can send.
 */
export default function ExpenseSettingsPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<ExpenseOptionRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ExpenseOptionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remove, removeState] = useMutation(DELETE_EXPENSE_OPTION);

  const tabs = useTabParam<ExpenseOptionKind>({
    items: EXPENSE_OPTION_KINDS.map((kind) => ({ value: kind, label: t(KIND_LABEL_KEYS[kind]) })),
    fallback: 'RELATED_FROM_TYPE',
  });
  const kind = tabs.value;

  const optionsQuery = useQuery<OptionsQueryData>(EXPENSE_OPTIONS_TABLE, {
    variables: { kind },
    fetchPolicy: 'cache-and-network',
  });
  const rows = optionsQuery.data?.expenseOptionsTable ?? [];
  const entitySources = optionsQuery.data?.expenseEntitySources ?? [];

  // The form's dropdowns read `expenseOptions`, a different query on the same
  // rows — refetching both is what makes a new category appear on the Expense
  // form without a reload.
  const refetch = optionsQuery.refetch;
  const afterWrite = useCallback(() => {
    refetch().catch((e) => setError(parseApiError(e)));
  }, [refetch]);

  const openNew = () => {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  };
  const openEdit = useCallback((row: ExpenseOptionRow) => {
    setEditing(row);
    setError(null);
    setFormOpen(true);
  }, []);

  const confirmDelete = async (row: ExpenseOptionRow) => {
    try {
      await remove({ variables: { option_id: row.id } });
      setPendingDelete(null);
      afterWrite();
    } catch (e) {
      setPendingDelete(null);
      setError(parseApiError(e));
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('finance.expenseConfig.title')}
        subtitle={t('finance.expenseConfig.subtitle')}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box>
          <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />
          <Divider sx={{ mb: 2 }} />
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('finance.expenseConfig.disableRatherThanDelete')}
          </Alert>
          <ExpenseOptionTable
            rows={rows}
            showSource={kind === 'RELATED_FROM_TYPE'}
            onEdit={openEdit}
            onDelete={setPendingDelete}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2 }}>
            <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={openNew}>
              {t('finance.expenseConfig.addOption')}
            </DuncitButton>
          </Stack>
        </Box>
      </Stack>

      <ExpenseOptionDialog
        open={formOpen}
        kind={kind}
        option={editing}
        entitySources={entitySources}
        onClose={() => setFormOpen(false)}
        onSaved={afterWrite}
      />

      {pendingDelete && (
        <ConfirmDialog
          open
          destructive
          busy={removeState.loading}
          title={t('finance.expenseConfig.deleteOption')}
          message={t('finance.expenseConfig.deleteOptionConfirm', {
            vars: { label: pendingDelete.label },
          })}
          confirmLabel={t('shell.common.delete')}
          onConfirm={() => confirmDelete(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </Box>
  );
}
