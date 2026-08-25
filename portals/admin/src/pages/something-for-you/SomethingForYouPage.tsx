import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useConfirm } from '@duncit/dialogs';
import ItemFormDialog from './ItemFormDialog';
import ItemRow from './ItemRow';
import {
  CREATE_SOMETHING_FOR_YOU,
  DELETE_SOMETHING_FOR_YOU,
  SOMETHING_FOR_YOU_ITEMS,
  UPDATE_SOMETHING_FOR_YOU,
  emptyItem,
  type SomethingForYouForm,
} from './queries';
import { useTranslation } from '@duncit/shell';

type Saved = SomethingForYouForm & { id: string };

/**
 * The rail at the bottom of Home, edited.
 *
 * One list, rendered identically by mWeb and by the native app (rule 27), so a
 * promotion is changed here rather than in two codebases. Each card carries its
 * own picture; the frame, the type and the bottom strip are the surfaces' job,
 * which is what keeps them looking like one product.
 */
export default function SomethingForYouPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(SOMETHING_FOR_YOU_ITEMS);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SomethingForYouForm>(emptyItem);
  const [createItem, createState] = useMutation(CREATE_SOMETHING_FOR_YOU);
  const [updateItem, updateState] = useMutation(UPDATE_SOMETHING_FOR_YOU);
  const [deleteItem] = useMutation(DELETE_SOMETHING_FOR_YOU);
  const confirm = useConfirm();
  const busy = createState.loading || updateState.loading;
  const items: Saved[] = data?.somethingForYouItems ?? [];

  const startCreate = () => {
    // A new card goes to the end rather than fighting for the first slot.
    setForm({ ...emptyItem, sort_order: items.length });
    setOpen(true);
  };

  const startEdit = (item: Saved) => {
    setForm({
      id: item.id,
      title: item.title,
      image_url: item.image_url,
      bottom_text: item.bottom_text,
      action_type: item.action_type,
      link_path: item.link_path,
      link_url: item.link_url,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const { id, ...input } = form;
    if (id) await updateItem({ variables: { itemId: id, input } });
    else await createItem({ variables: { input } });
    setOpen(false);
    await refetch();
  };

  const remove = async (item: Saved) => {
    const ok = await confirm({
      title: t('admin.somethingForYou.deleteCard'),
      message: `Delete "${item.title}"? It disappears from Home on both mWeb and the app.`,
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    await deleteItem({ variables: { itemId: item.id } });
    await refetch();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{
        alignItems: "center"
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Something for you
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            The row that scrolls sideways at the bottom of Home, on mWeb and in the app.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={startCreate}>
          New card
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && <CircularProgress size={24} />}
      {!loading && items.length === 0 && (
        <Alert severity="info">{t('admin.somethingForYou.empty')}</Alert>
      )}

      <Stack spacing={1.5}>
        {items.map((item) => (
          <ItemRow key={item.id} item={item} onEdit={startEdit} onRemove={remove} />
        ))}
      </Stack>

      <ItemFormDialog
        open={open}
        form={form}
        setForm={setForm}
        busy={busy}
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </Stack>
  );
}
