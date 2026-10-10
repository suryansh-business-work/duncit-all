import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import {
  CATEGORIES,
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  DELETE_CATEGORY,
  CatItem,
  Level,
  blankForm,
} from '../queries';
import CategoryFormDialog from '../CategoryFormDialog';
import CategoriesColumns from '../CategoriesColumns';
import CategoryDeleteDialog from '../CategoryDeleteDialog';
import AllVibeIconCard from '../AllVibeIconCard';
import VibeHeadingCard from '../VibeHeadingCard';
import { buildCreateInput, buildMediaFromText, buildUpdateInput } from '../helpers';
import { useTranslation } from '@duncit/shell';
import { editFormFor, type DialogState } from './dialogState';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [superSel, setSuperSel] = useState<CatItem | null>(null);
  const [catSel, setCatSel] = useState<CatItem | null>(null);
  const [subSel, setSubSel] = useState<CatItem | null>(null);

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<{ level: Level; item: CatItem } | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const [createMut] = useMutation<unknown>(CREATE_CATEGORY);
  const [updateMut] = useMutation<unknown>(UPDATE_CATEGORY);
  const [deleteMut] = useMutation<unknown>(DELETE_CATEGORY);

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
      form: editFormFor(item),
    });
  };

  // Only the dialog's Save calls this, and Save is disabled once `dialog` is null.
  const submit = async () => {
    const { form, level, parentId } = dialog as DialogState;
    setBusy(true);
    setOpError(null);
    try {
      const media = buildMediaFromText(form.mediaText);
      if (form.id) {
        await updateMut({
          variables: {
            category_id: form.id,
            input: buildUpdateInput(form, media, level),
          },
          refetchQueries,
        });
      } else {
        await createMut({
          variables: { input: buildCreateInput(form, level, parentId, media) },
          refetchQueries,
        });
      }
      setToast(t('shell.common.saved'));
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
        setSubSel(null);
      }
      if (delTarget.level === 'CATEGORY' && catSel?.id === delTarget.item.id) {
        setCatSel(null);
        setSubSel(null);
      }
      if (subSel?.id === delTarget.item.id) setSubSel(null);
      setToast(t('shell.common.deleted'));
      setDelTarget(null);
    } catch (e: any) {
      setDelError(e.message);
    } finally {
      setDelBusy(false);
    }
  };

  // minHeight, not height: the page was pinned to the viewport, so every row the
  // settings card above gained came straight out of the three columns until they
  // were too short to work in. Now the columns keep their height and the PAGE
  // scrolls instead.
  return (
    <Stack spacing={3} sx={{ minHeight: 'calc(100vh - 140px)' }}>
      <Box>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <CategoryIcon color="primary" />
          <Typography variant="h5" component="h1">{t('admin.categories.title')}</Typography>
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Manage Super Categories (Human / Pet), their categories and sub-categories. Click an
          item to drill down.
        </Typography>
      </Box>

      <AllVibeIconCard />

      <VibeHeadingCard />

      <CategoriesColumns
        superSel={superSel}
        catSel={catSel}
        subSel={subSel}
        setSuperSel={setSuperSel}
        setCatSel={setCatSel}
        setSubSel={setSubSel}
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
