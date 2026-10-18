import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import GigCategoriesTable from './GigCategoriesTable';
import GigCategoryFormDialog from './GigCategoryFormDialog';
import { toGigCategoryInput, type GigCategoryFormValues, type GigCategoryRow } from './gig-category';
import { CREATE_GIG_CATEGORY, DELETE_GIG_CATEGORY, GIG_CATEGORIES_TABLE, UPDATE_GIG_CATEGORY } from './queries';

/**
 * Admin > Catalog > Gig Categories — the categories and roles Gig Jobs posts
 * and freelancer profiles pick from. Switching one off hides it from new
 * posts; a category still in use cannot be deleted (the server refuses).
 */
export default function GigCategoriesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<GigCategoryRow | null>(null);
  const [open, setOpen] = useState(false);
  const [createMut, createState] = useMutation(CREATE_GIG_CATEGORY);
  const [updateMut, updateState] = useMutation(UPDATE_GIG_CATEGORY);
  const [deleteMut] = useMutation(DELETE_GIG_CATEGORY);
  const fetchRows = useApolloTableFetch<GigCategoryRow>(client, GIG_CATEGORIES_TABLE, 'gigCategoriesTable');

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const save = async (values: GigCategoryFormValues) => {
    const input = toGigCategoryInput(values);
    try {
      if (editing) await updateMut({ variables: { id: editing.id, input } });
      else await createMut({ variables: { input } });
      notifySuccess(t('gigJobs.admin.saved'));
      close();
      refetchRef.current?.();
    } catch (err) {
      notifyError(parseApiError(err, t('gigJobs.admin.saveFailed')));
    }
  };

  const onEdit = useCallback((row: GigCategoryRow) => {
    setEditing(row);
    setOpen(true);
  }, []);

  const onDelete = useCallback(
    async (row: GigCategoryRow) => {
      const ok = await confirm({
        title: t('gigJobs.admin.deleteTitle'),
        message: t('gigJobs.admin.deleteBody'),
        destructive: true,
        confirmLabel: t('shell.common.delete'),
      });
      if (!ok) return;
      try {
        await deleteMut({ variables: { id: row.id } });
        notifySuccess(t('gigJobs.admin.deleted'));
        refetchRef.current?.();
      } catch (err) {
        notifyError(parseApiError(err, t('gigJobs.admin.deleteFailed')));
      }
    },
    [confirm, deleteMut, t],
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.admin.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.admin.subtitle')}
        </Typography>
      </Stack>
      <GigCategoriesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={onEdit}
        onDelete={onDelete}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            {t('gigJobs.admin.new')}
          </DuncitButton>
        }
      />
      <GigCategoryFormDialog
        open={open}
        editing={editing}
        loading={createState.loading || updateState.loading}
        onClose={close}
        onSubmit={save}
      />
    </Stack>
  );
}
