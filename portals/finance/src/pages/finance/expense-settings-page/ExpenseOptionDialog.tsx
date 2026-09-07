import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import ExpenseOptionForm, { type ExpenseOptionFormValues } from './expense-option-form';
import {
  CREATE_EXPENSE_OPTION,
  UPDATE_EXPENSE_OPTION,
  type ExpenseOptionKind,
  type ExpenseOptionRow,
} from '../expense-config';

interface Props {
  open: boolean;
  kind: ExpenseOptionKind;
  /** The row being edited, or null to add one. */
  option: ExpenseOptionRow | null;
  entitySources: string[];
  onClose: () => void;
  onSaved: () => void;
}

/** Add or edit one row of one configured Expense list. */
export default function ExpenseOptionDialog({
  open,
  kind,
  option,
  entitySources,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [create, createState] = useMutation(CREATE_EXPENSE_OPTION);
  const [update, updateState] = useMutation(UPDATE_EXPENSE_OPTION);
  const busy = createState.loading || updateState.loading;

  const submit = async (values: ExpenseOptionFormValues) => {
    setError(null);
    try {
      if (option) {
        // The key is never sent on an update — it is what every expense filed
        // under this option stores, and the server refuses to move it.
        const { key: _key, ...editable } = values;
        await update({ variables: { option_id: option.id, input: editable } });
      } else {
        await create({ variables: { kind, input: values } });
      }
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
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>
        {option ? t('finance.expenseConfig.editOption') : t('finance.expenseConfig.addOption')}
      </DialogTitle>
      <DialogContent>
        <ExpenseOptionForm
          kind={kind}
          option={option}
          entitySources={entitySources}
          busy={busy}
          errorMessage={error}
          onCancel={close}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}
