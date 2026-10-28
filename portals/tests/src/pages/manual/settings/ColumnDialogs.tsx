import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { ManualFormDialog } from '../../../components/manual/ManualFormDialog';
import { manualErrorText } from '../shared/errors';
import {
  CREATE_MANUAL_TEST_COLUMN,
  DELETE_MANUAL_TEST_COLUMN,
  UPDATE_MANUAL_TEST_COLUMN,
  type CreateColumnData,
  type DeleteColumnVariables,
  type SaveColumnVariables,
  type UpdateColumnData,
} from '../shared/settings.queries';
import type { ManualColumn } from '../shared/types';
import { COLUMN_FORM_ID, ColumnForm, columnValuesOf, toColumnInput, type ColumnValues } from './column';
import { DELETE_COLUMN_FORM_ID, DeleteColumnForm, type DeleteColumnValues } from './delete-column';

const WHERE = { page: '/manual/settings', component: 'ColumnDialogs' };

interface EditProps {
  /** The column being changed; null adds one. */
  column: ManualColumn | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Add or change a column. Mount only while open. */
export function ColumnDialog({ column, onClose, onSaved }: Readonly<EditProps>) {
  const { t } = useTranslation();
  const [create, creating] = useMutation<CreateColumnData, SaveColumnVariables>(CREATE_MANUAL_TEST_COLUMN);
  const [update, updating] = useMutation<UpdateColumnData, SaveColumnVariables>(UPDATE_MANUAL_TEST_COLUMN);

  const submit = async (values: ColumnValues) => {
    const input = toColumnInput(values);
    try {
      if (column) await update({ variables: { id: column.id, input } });
      else await create({ variables: { input } });
      notifySuccess(t('testsManual.settings.saved', { vars: { name: input.name } }));
      onSaved();
      onClose();
    } catch (err) {
      notifyError(manualErrorText(t, err, t('testsManual.settings.saveFailed'), WHERE));
    }
  };

  return (
    <ManualFormDialog
      title={column ? t('testsManual.settings.editColumn') : t('testsManual.settings.addColumn')}
      formId={COLUMN_FORM_ID}
      saving={creating.loading || updating.loading}
      onClose={onClose}
    >
      <ColumnForm initial={column ? columnValuesOf(column) : undefined} onSubmit={submit} />
    </ManualFormDialog>
  );
}

interface DeleteProps {
  column: ManualColumn;
  targets: readonly ManualColumn[];
  onClose: () => void;
  onDeleted: () => void;
}

/** Delete a column after choosing where its cases go. Mount only while open. */
export function DeleteColumnDialog({ column, targets, onClose, onDeleted }: Readonly<DeleteProps>) {
  const { t } = useTranslation();
  const [remove, { loading }] = useMutation<{ deleteManualTestColumn: boolean }, DeleteColumnVariables>(
    DELETE_MANUAL_TEST_COLUMN
  );

  const submit = async (values: DeleteColumnValues) => {
    try {
      await remove({ variables: { id: column.id, target_column_id: values.target_column_id } });
      notifySuccess(t('testsManual.settings.deleted', { vars: { name: column.name } }));
      onDeleted();
      onClose();
    } catch (err) {
      notifyError(manualErrorText(t, err, t('testsManual.settings.deleteFailed'), WHERE));
    }
  };

  return (
    <ManualFormDialog
      title={t('testsManual.settings.deleteTitle', { vars: { name: column.name } })}
      formId={DELETE_COLUMN_FORM_ID}
      saving={loading}
      onClose={onClose}
      submitLabel={t('shell.common.delete')}
      destructive
    >
      <DeleteColumnForm column={column} targets={targets} onSubmit={submit} />
    </ManualFormDialog>
  );
}
