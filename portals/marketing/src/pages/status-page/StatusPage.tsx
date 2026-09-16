import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  CREATE_OFFICIAL_STATUS,
  DELETE_OFFICIAL_STATUS,
  LOCATIONS_FOR_STATUS,
  OFFICIAL_STATUSES_TABLE,
  UPDATE_OFFICIAL_STATUS,
  type OfficialStatusRow,
  type StatusLocationOption,
} from './queries';
import StatusForm, {
  blankStatusValues,
  toStatusInput,
  toStatusValues,
  type StatusFormValues,
} from './status-form';
import StatusTable from './StatusTable';

/**
 * Marketing > Status — the statuses Duncit itself publishes.
 *
 * A status is not sent; it is published. The apps read the live ones on every
 * open, so switching one off or letting it expire takes it out of the rail
 * without anything being dispatched and without the row leaving this table.
 */
export default function StatusPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const confirm = useConfirm();

  const { data: locationsData } = useQuery<{ locations: StatusLocationOption[] }>(
    LOCATIONS_FOR_STATUS,
    { fetchPolicy: 'cache-and-network' },
  );
  const [createMut] = useMutation(CREATE_OFFICIAL_STATUS);
  const [updateMut] = useMutation(UPDATE_OFFICIAL_STATUS);
  const [deleteMut] = useMutation(DELETE_OFFICIAL_STATUS);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfficialStatusRow | null>(null);
  const [initialValues, setInitialValues] = useState<StatusFormValues>(blankStatusValues);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const locations = locationsData?.locations ?? [];
  const fetchRows = useApolloTableFetch<OfficialStatusRow>(
    client,
    OFFICIAL_STATUSES_TABLE,
    'officialStatusesTable',
  );

  const openCreate = () => {
    setEditing(null);
    setInitialValues(blankStatusValues());
    setOpError(null);
    setOpen(true);
  };

  const openEdit = useCallback((status: OfficialStatusRow) => {
    setEditing(status);
    setInitialValues(toStatusValues(status));
    setOpError(null);
    setOpen(true);
  }, []);

  const submit = async (values: StatusFormValues) => {
    setBusy(true);
    setOpError(null);
    try {
      const input = toStatusInput(values);
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        setToast(t('marketing.status.statusUpdated'));
      } else {
        await createMut({ variables: { input } });
        setToast(t('marketing.status.statusCreated'));
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
    async (status: OfficialStatusRow) => {
      const ok = await confirm({
        title: t('marketing.status.deleteStatus'),
        message: t('marketing.status.deleteConfirm', { vars: { title: status.title } }),
        destructive: true,
        confirmLabel: t('shell.common.delete'),
      });
      if (!ok) return;
      try {
        await deleteMut({ variables: { id: status.id } });
        setToast(t('shell.common.deleted'));
        refetchRef.current?.();
      } catch (e) {
        notifyError(parseApiError(e));
      }
    },
    [confirm, deleteMut, t],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <AutoAwesomeIcon color="primary" />
          <Typography component="h1" variant="h5">
            {t('shell.nav.status')}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('marketing.status.intro')}
        </Typography>
      </Box>

      <StatusTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            data-testid="status-new"
          >
            {t('marketing.status.newStatus')}
          </DuncitButton>
        }
        onEdit={openEdit}
        onDelete={remove}
      />

      <Dialog open={open} onClose={busy ? undefined : () => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing ? t('marketing.status.editStatus') : t('marketing.status.newStatus')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <StatusForm
              // Remounting on the edited row drops the previous status's values,
              // which defaultValues alone would keep across dialog opens.
              key={editing?.id ?? 'new'}
              locations={locations}
              initialValues={initialValues}
              busy={busy}
              errorMessage={opError}
              submitLabel={
                editing ? t('marketing.status.saveChanges') : t('marketing.status.createStatus')
              }
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
