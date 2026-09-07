import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import ExpenseForm, {
  toExpenseInput,
  type ExpenseFormValues,
  type ExpenseRecord,
} from './expense-form';
import RefundTimeline from './RefundTimeline';
import { ADD_REFUND, CREATE_EXPENSE, DELETE_EXPENSE, REMOVE_REFUND, UPDATE_EXPENSE } from './queries';

interface Props {
  open: boolean;
  expense: ExpenseRecord | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * The side panel one ledger row opens in.
 *
 * It holds the expense itself and, once saved, the refunds received against
 * it. Refunds and COMPENSATION are different things and both are kept: a
 * refund is money the vendor gave back, compensation is somebody inside Duncit
 * settling the cost — an expense can have either, both or neither.
 */
export default function ExpenseDrawer({
  open,
  expense,
  currency,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<ExpenseRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [create, createState] = useMutation<{ createExpense: ExpenseRecord }>(CREATE_EXPENSE);
  const [update, updateState] = useMutation<{ updateExpense: ExpenseRecord }>(UPDATE_EXPENSE);
  const [addRefund] = useMutation<{ addExpenseRefund: ExpenseRecord }>(ADD_REFUND);
  const [removeRefund] = useMutation<{ removeExpenseRefund: ExpenseRecord }>(REMOVE_REFUND);
  const [del, delState] = useMutation(DELETE_EXPENSE);
  const saving = createState.loading || updateState.loading;

  useEffect(() => {
    setError(null);
    setConfirmingDelete(false);
    setCurrent(expense);
  }, [expense, open]);

  const save = async (values: ExpenseFormValues) => {
    setError(null);
    const input = toExpenseInput(values);
    try {
      if (current) await update({ variables: { id: current.id, input } });
      else await create({ variables: { input } });
      onSaved();
      onClose();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const refund = async (input: { date: string; amount: number; note: string }) => {
    if (!current) return;
    const res = await addRefund({ variables: { id: current.id, input } });
    setCurrent(res.data?.addExpenseRefund ?? current);
    onSaved();
  };
  const dropRefund = async (refund_id: string) => {
    if (!current) return;
    const res = await removeRefund({ variables: { id: current.id, refund_id } });
    setCurrent(res.data?.removeExpenseRefund ?? current);
    onSaved();
  };
  const remove = async (row: ExpenseRecord) => {
    try {
      await del({ variables: { id: row.id } });
      setConfirmingDelete(false);
      onSaved();
      onClose();
    } catch (e) {
      setConfirmingDelete(false);
      setError(parseApiError(e));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 }, p: 2.5 } } }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, flex: 1 }}>
          {current
            ? t('finance.expenseManagement.expenseDetails')
            : t('finance.expenseManagement.newExpense')}
        </Typography>
        {current && (
          <DuncitIconButton
            color="error"
            aria-label={t('finance.expenseManagement.deleteExpense')}
            onClick={() => setConfirmingDelete(true)}
          >
            <DeleteOutlineIcon />
          </DuncitIconButton>
        )}
        <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <ExpenseForm
        expense={current}
        currency={currency}
        busy={saving}
        onCancel={onClose}
        onSubmit={save}
      />

      {current && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <RefundTimeline expense={current} onAdd={refund} onRemove={dropRefund} />
        </Box>
      )}

      {confirmingDelete && current && (
        <ConfirmDialog
          open
          destructive
          busy={delState.loading}
          title={t('finance.expenseManagement.deleteExpense')}
          message={t('finance.expenseManagement.deleteExpenseConfirm')}
          confirmLabel={t('shell.common.delete')}
          onConfirm={() => remove(current)}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </Drawer>
  );
}
