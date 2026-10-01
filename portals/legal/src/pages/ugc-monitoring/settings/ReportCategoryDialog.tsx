import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import {
  CREATE_REPORT_CATEGORY,
  UPDATE_REPORT_CATEGORY,
  type ReportCategory,
} from '../../../graphql/reports';
import {
  EMPTY_REPORT_CATEGORY,
  ReportCategoryForm,
  toCategoryFormValues,
  toCategoryInput,
  type ReportCategoryFormValues,
} from './report-category-form';

const FORM_ID = 'report-category-form';

interface Props {
  open: boolean;
  /** The category being edited; null while adding a new one. */
  editing: ReportCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Add a report category, or edit one.
 *
 * What is saved here is what the report dialog on mWeb and the native app
 * shows next time it opens — there is no publish step in between.
 */
export default function ReportCategoryDialog({ open, editing, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [create, createState] = useMutation(CREATE_REPORT_CATEGORY);
  const [update, updateState] = useMutation(UPDATE_REPORT_CATEGORY);
  const saving = createState.loading || updateState.loading;

  useEffect(() => {
    if (open) setError('');
  }, [open, editing]);

  // Memoised on the row, so the form re-seeds when the dialog is pointed at a
  // different category and not on every render.
  const initialValues = useMemo(
    () => (editing ? toCategoryFormValues(editing) : EMPTY_REPORT_CATEGORY),
    [editing],
  );

  const submit = async (values: ReportCategoryFormValues) => {
    setError('');
    const input = toCategoryInput(values);
    try {
      if (editing) await update({ variables: { id: editing.id, input } });
      else await create({ variables: { input } });
      onSaved();
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('reportLogs.categorySaveFailed'));
    }
  };

  return (
    <Dialog
      data-testid="report-category-dialog"
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{t(editing ? 'reportLogs.editCategory' : 'reportLogs.addCategory')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && (
            <Alert data-testid="report-category-error" severity="error">
              {error}
            </Alert>
          )}
          <ReportCategoryForm
            formId={FORM_ID}
            initialValues={initialValues}
            disabled={saving}
            onSubmit={submit}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="report-category-cancel" onClick={onClose} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          data-testid="report-category-save"
          type="submit"
          form={FORM_ID}
          variant="contained"
          disabled={saving}
        >
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
