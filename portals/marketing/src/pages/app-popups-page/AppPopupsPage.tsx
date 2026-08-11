import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import {
  APP_POPUPS_TABLE,
  AUDIENCE_LISTS_FOR_POPUP,
  CREATE_APP_POPUP,
  DELETE_APP_POPUP,
  UPDATE_APP_POPUP,
  type AppPopupRow,
} from './queries';
import AppPopupForm, {
  blankAppPopupValues,
  toAppPopupInput,
  toAppPopupValues,
  type AppPopupFormValues,
} from './app-popup-form';
import AppPopupsTable from './AppPopupsTable';

/**
 * App Popups — the full-screen image the app shows when it opens.
 *
 * A popup is not sent; it is published. The date window and the enable switch
 * are read on every app open, so a campaign starts, stops and changes audience
 * without anything being dispatched.
 */
export default function AppPopupsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const confirm = useConfirm();

  const { data: listsData } = useQuery(AUDIENCE_LISTS_FOR_POPUP, {
    fetchPolicy: 'cache-and-network',
  });
  const [createMut] = useMutation(CREATE_APP_POPUP);
  const [updateMut] = useMutation(UPDATE_APP_POPUP);
  const [deleteMut] = useMutation(DELETE_APP_POPUP);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppPopupRow | null>(null);
  const [initialValues, setInitialValues] = useState<AppPopupFormValues>(blankAppPopupValues);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const audienceLists = listsData?.audienceLists ?? [];
  const listName = useCallback(
    (id?: string | null) =>
      (listsData?.audienceLists ?? []).find((l: any) => l.id === id)?.name ?? '—',
    [listsData],
  );

  const fetchRows = useApolloTableFetch<AppPopupRow>(client, APP_POPUPS_TABLE, 'appPopupsTable');

  const openCreate = () => {
    setEditing(null);
    setInitialValues(blankAppPopupValues());
    setOpError(null);
    setOpen(true);
  };

  const openEdit = useCallback((popup: AppPopupRow) => {
    setEditing(popup);
    setInitialValues(toAppPopupValues(popup));
    setOpError(null);
    setOpen(true);
  }, []);

  const submit = async (values: AppPopupFormValues) => {
    setBusy(true);
    setOpError(null);
    try {
      const input = toAppPopupInput(values);
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        setToast('Popup updated');
      } else {
        await createMut({ variables: { input } });
        setToast('Popup created');
      }
      setOpen(false);
      refetchRef.current?.();
    } catch (e) {
      setOpError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = useCallback(
    async (popup: AppPopupRow) => {
      const ok = await confirm({
        title: 'Delete popup',
        message: `Delete "${popup.name}"? It stops showing in the app immediately.`,
        destructive: true,
        confirmLabel: 'Delete',
      });
      if (!ok) return;
      try {
        await deleteMut({ variables: { id: popup.id } });
        setToast('Deleted');
        refetchRef.current?.();
      } catch (e) {
        notifyError(parseApiError(e));
      }
    },
    [confirm, deleteMut],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PhoneIphoneIcon color="primary" />
          <Typography variant="h5">App Popups</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          A full-screen image shown when the app opens. Each person sees a popup once — closing it
          is remembered, so it never comes back.
        </Typography>
      </Box>

      <AppPopupsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        listName={listName}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Popup
          </Button>
        }
        onEdit={openEdit}
        onDelete={remove}
      />

      <Dialog open={open} onClose={busy ? undefined : () => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit popup' : 'New popup'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <AppPopupForm
              // Remounting on the edited row drops the previous popup's values,
              // which defaultValues alone would keep across dialog opens.
              key={editing?.id ?? 'new'}
              audienceLists={audienceLists}
              initialValues={initialValues}
              busy={busy}
              errorMessage={opError}
              submitLabel={editing ? 'Save changes' : 'Create popup'}
              onCancel={() => setOpen(false)}
              onSubmit={submit}
            />
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={3500}
        message={toast}
      />
    </Stack>
  );
}
