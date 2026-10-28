import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import type { MutationCreateManualCaseArgs } from '@duncit/gql-types';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CREATE_MANUAL_CASE, type CreateCaseData } from '../../shared/board.queries';
import { manualErrorText } from '../../shared/errors';
import QuickCreateForm from './quick-create.form';
import type { QuickCreateValues } from './quick-create.types';

interface Props {
  columnId: string;
  columnName: string;
  /** Called after a case is filed — the board reloads to place it under the current filter. */
  onCreated: () => void;
}

const WHERE = { page: '/manual/board', component: 'QuickCreate' };

/** "Create case" at the foot of a column, opening into a two-field form. */
export default function QuickCreate({ columnId, columnName, onCreated }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [create, { loading }] = useMutation<CreateCaseData, MutationCreateManualCaseArgs>(CREATE_MANUAL_CASE);

  const submit = async (values: QuickCreateValues): Promise<boolean> => {
    try {
      const result = await create({ variables: { input: { ...values, column_id: columnId } } });
      const key = result.data?.createManualCase.key ?? '';
      notifySuccess(t('testsManual.quickCreate.created', { vars: { key, column: columnName } }));
      onCreated();
      return true;
    } catch (err) {
      notifyError(manualErrorText(t, err, t('testsManual.quickCreate.failed'), WHERE));
      return false;
    }
  };

  if (open) return <QuickCreateForm onSubmit={submit} onCancel={() => setOpen(false)} saving={loading} />;
  return (
    <DuncitButton
      size="small"
      startIcon={<AddIcon />}
      onClick={() => setOpen(true)}
      aria-label={t('testsManual.quickCreate.openNamed', { vars: { column: columnName } })}
      sx={{ m: 1, justifyContent: 'flex-start' }}
    >
      {t('testsManual.quickCreate.open')}
    </DuncitButton>
  );
}
