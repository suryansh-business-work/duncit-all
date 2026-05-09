import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import {
  CATEGORIES,
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  DELETE_CATEGORY,
  CatItem,
  FormState,
  Level,
  blankForm,
} from './queries';
import CategoryFormDialog from './CategoryFormDialog';
import CategoriesColumns from './CategoriesColumns';
import CategoryDeleteDialog from './CategoryDeleteDialog';
import { isImageIconValue } from '../../components/IconPickerField';

interface DialogState {
  open: boolean;
  level: Level;
  parentId: string | null;
  form: FormState;
}

export default function CategoriesPage() {
  const [superSel, setSuperSel] = useState<CatItem | null>(null);
  const [catSel, setCatSel] = useState<CatItem | null>(null);

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<{ level: Level; item: CatItem } | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const [createMut] = useMutation(CREATE_CATEGORY);
  const [updateMut] = useMutation(UPDATE_CATEGORY);
  const [deleteMut] = useMutation(DELETE_CATEGORY);

  const refetchQueries = useMemo(
    () => [
      { query: CATEGORIES, variables: { filter: { level: 'SUPER', parent_id: null } } },
      ...(superSel
        ? [{ query: CATEGORIES, variables: { filter: { level: 'CATEGORY', parent_id: superSel.id } } }]
        : []),
      ...(catSel
        ? [{ query: CATEGORIES, variables: { filter: { level: 'SUB', parent_id: catSel.id } } }]
        : []),
    ],
    [superSel, catSel]
  );

  const openCreate = (level: Level, parentId: string | null) => {
    setOpError(null);
    setDialog({ open: true, level, parentId, form: { ...blankForm } });
  };
  const openEdit = (level: Level, parentId: string | null, item: CatItem) => {
    setOpError(null);
    setDialog({
      open: true,
      level,
      parentId,
      form: {
        id: item.id,
        name: item.name,
        icon: item.icon ?? '',
        iconMode: isImageIconValue(item.icon) ? 'IMAGE' : 'ICON',
        description: item.description ?? '',
        mediaText: item.media.map((m) => m.url).join('\n'),
        sort_order: item.sort_order,
        is_active: item.is_active,
      },
    });
  };

  const submit = async () => {
    if (!dialog) return;
    setBusy(true);
    setOpError(null);
    try {
      const media = dialog.form.mediaText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({
          url,
          type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE',
        }));

      if (dialog.form.id) {
        await updateMut({
          variables: {
            category_id: dialog.form.id,
            input: {
              name: dialog.form.name,
              icon: dialog.form.icon,
              description: dialog.form.description,
              media,
              sort_order: dialog.form.sort_order,
              is_active: dialog.form.is_active,
            },
          },
          refetchQueries,
        });
      } else {
        await createMut({
          variables: {
            input: {
              name: dialog.form.name,
              level: dialog.level,
              parent_id: dialog.parentId,
              icon: dialog.form.icon,
              description: dialog.form.description,
              media,
              sort_order: dialog.form.sort_order,
            },
          },
          refetchQueries,
        });
      }
      setToast('Saved');
      setDialog(null);
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (level: Level, item: CatItem) => {
    setDelError(null);
    setDelTarget({ level, item });
  };

  const confirmRemove = async () => {
    if (!delTarget) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await deleteMut({ variables: { category_id: delTarget.item.id }, refetchQueries });
      if (delTarget.level === 'SUPER' && superSel?.id === delTarget.item.id) {
        setSuperSel(null);
        setCatSel(null);
      }
      if (delTarget.level === 'CATEGORY' && catSel?.id === delTarget.item.id) {
        setCatSel(null);
      }
      setToast('Deleted');
      setDelTarget(null);
    } catch (e: any) {
      setDelError(e.message);
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ height: 'calc(100vh - 140px)' }}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CategoryIcon color="primary" />
          <Typography variant="h5">Category Management</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Manage Super Categories (Human / Pet), their categories and sub-categories. Click an
          item to drill down.
        </Typography>
      </Box>

      <CategoriesColumns
        superSel={superSel}
        catSel={catSel}
        setSuperSel={setSuperSel}
        setCatSel={setCatSel}
        openCreate={openCreate}
        openEdit={openEdit}
        remove={remove}
      />

      <CategoryFormDialog
        dialog={dialog}
        setDialog={setDialog}
        busy={busy}
        opError={opError}
        onSubmit={submit}
      />

      <CategoryDeleteDialog
        target={delTarget}
        busy={delBusy}
        error={delError}
        onClose={() => setDelTarget(null)}
        onConfirm={confirmRemove}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
