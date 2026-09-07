import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError, type EmployeeExpenseClaim } from '@duncit/utils';
import ExpenseClaimForm, {
  toExpenseClaimInput,
  type ExpenseClaimFormValues,
} from './expense-claim-form';
import { CREATE_EXPENSE_CLAIM, UPDATE_EXPENSE_CLAIM } from './queries';

interface Props {
  open: boolean;
  /** The claim being edited, or null to file a new one. */
  claim: EmployeeExpenseClaim | null;
  currency: string;
  onClose: () => void;
  /** Refresh the list + tiles after a successful write. */
  onSaved: () => void;
}

/** The dialog an employee files or edits a claim in. */
export default function ExpenseClaimDialog({
  open,
  claim,
  currency,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [create, createState] = useMutation(CREATE_EXPENSE_CLAIM);
  const [update, updateState] = useMutation(UPDATE_EXPENSE_CLAIM);
  const busy = createState.loading || updateState.loading;

  const submit = async (values: ExpenseClaimFormValues) => {
    setError(null);
    const input = toExpenseClaimInput(values);
    try {
      if (claim) await update({ variables: { expense_doc_id: claim.id, input } });
      else await create({ variables: { input } });
      onSaved();
      onClose();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const close = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>
        {claim ? t('employeeExpense.mine.editClaim') : t('employeeExpense.mine.newClaim')}
      </DialogTitle>
      <DialogContent>
        <ExpenseClaimForm
          claim={claim}
          currency={currency}
          busy={busy}
          errorMessage={error}
          onCancel={close}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}
