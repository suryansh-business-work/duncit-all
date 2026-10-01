import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import {
  DELETE_REPORT_CATEGORY,
  REPORT_CATEGORIES_TABLE,
  type ReportCategory,
} from '../../../graphql/reports';
import ReportCategoriesTable from './ReportCategoriesTable';
import ReportCategoryDialog from './ReportCategoryDialog';

/** Which category the dialog is open on: one to edit, or `null` for a new one. */
type DialogTarget = { category: ReportCategory | null };

/**
 * UGC Monitoring > Settings — the reasons the report dialog offers.
 *
 * Legal owns this list. Adding "Copyright issue" here puts it in the dialog on
 * mWeb and the native app the next time it opens; switching one off takes it
 * out again without touching the reports already filed under it.
 */
export default function ReportSettingsTab() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [remove] = useMutation(DELETE_REPORT_CATEGORY);

  const fetchRows = useApolloTableFetch<ReportCategory>(
    client,
    REPORT_CATEGORIES_TABLE,
    'reportCategoriesTable',
  );

  const edit = useCallback((category: ReportCategory) => setDialog({ category }), []);

  const askDelete = useCallback(
    async (category: ReportCategory) => {
      const agreed = await confirm({
        title: t('reportLogs.categoryDeleteTitle'),
        message: t('reportLogs.categoryDeleteBody', { vars: { name: category.label } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!agreed) return;
      try {
        await remove({ variables: { id: category.id } });
        notifySuccess(t('reportLogs.categoryDeleted'));
        refetchRef.current?.();
      } catch (e) {
        // The server's own sentence when it has one: "reports were filed under
        // this category" is the answer, and a generic failure would hide it.
        notifyError(parseApiError(e) || t('reportLogs.categoryDeleteFailed'));
      }
    },
    [confirm, remove, t],
  );

  return (
    <Stack spacing={2} data-testid="ugc-settings-tab">
      <PageHeader
        title={t('reportLogs.settingsTitle')}
        subtitle={t('reportLogs.settingsSubtitle')}
        titleVariant="h6"
        actions={
          <DuncitButton
            data-testid="report-category-add"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ category: null })}
          >
            {t('reportLogs.addCategory')}
          </DuncitButton>
        }
      />

      <ReportCategoriesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onEdit={edit}
        onDelete={askDelete}
      />

      <ReportCategoryDialog
        open={dialog !== null}
        editing={dialog?.category ?? null}
        onClose={() => setDialog(null)}
        onSaved={() => {
          notifySuccess(t('reportLogs.categorySaved'));
          refetchRef.current?.();
        }}
      />
    </Stack>
  );
}
