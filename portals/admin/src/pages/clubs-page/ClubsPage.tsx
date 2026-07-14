import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import {
  blankClubFormValues,
  buildClubInput,
  clubToFormValues,
  type ClubAdmin,
  type ClubFormConfig,
  type ClubFormValues,
} from '@duncit/club-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { CLUBS_TABLE, CLUB_FOR_EDIT, CATEGORIES, CREATE, UPDATE, DELETE, type ClubRow } from './queries';
import ClubFormDialog from './ClubFormDialog';
import ClubsTable from './ClubsTable';
import ClubsToolbar from './ClubsToolbar';

const ADMIN_CLUB_CONFIG: ClubFormConfig = {
  showAdmins: true,
  showVerified: true,
  showIsActive: true,
};

export default function ClubsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit') ?? '';
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data: catData } = useQuery(CATEGORIES);
  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<ClubFormValues>(blankClubFormValues);
  const [initialAdmins, setInitialAdmins] = useState<ClubAdmin[]>([]);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFolder, setPickerFolder] = useState('/clubs');
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: CLUBS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.clubsTable.rows as ClubRow[], total: data.clubsTable.total as number };
    },
    [client],
  );

  // Bridge the URL-callback media picker to the shared form's promise picker.
  const pickImage = (folder = '/clubs') =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerFolder(folder);
      setPickerOpen(true);
    });
  const settlePicker = (url: string | null) => {
    pickerResolve.current?.(url);
    pickerResolve.current = null;
    setPickerOpen(false);
  };

  const openCreate = () => {
    setInitialValues({ ...blankClubFormValues });
    setInitialAdmins([]);
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (club: any) => {
    setInitialValues(clubToFormValues(club));
    setInitialAdmins((club.club_admins ?? []) as ClubAdmin[]);
    setOpError(null);
    setOpen(true);
  };

  // Deep-link from the Club details page: /clubs?edit=<id> opens the edit dialog.
  // Rows are server-paged now, so fetch the club directly instead of scanning the list.
  const handledEditRef = useRef('');
  useEffect(() => {
    if (!editId || handledEditRef.current === editId) return;
    handledEditRef.current = editId;
    client
      .query({ query: CLUB_FOR_EDIT, variables: { id: editId }, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        if (data?.club) openEdit(data.club);
      })
      .catch((e: Error) => notifyError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, client]);

  const submit = async (values: ClubFormValues, options: { draft: boolean }) => {
    setBusy(true);
    setOpError(null);
    try {
      const input = buildClubInput(values, { draft: options.draft, config: ADMIN_CLUB_CONFIG });
      if (values.id) {
        await updateMut({ variables: { id: values.id, input } });
      } else {
        await createMut({ variables: { input } });
      }
      setToast(options.draft ? 'Draft saved' : 'Saved');
      setOpen(false);
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: ClubRow) => {
    const ok = await confirm({
      title: 'Delete club',
      message: `Delete club "${c.club_name}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: c.id } });
      setToast('Deleted');
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const catName = useCallback(
    (id: string) => (catData?.categories ?? []).find((c: any) => c.id === id)?.name ?? '—',
    [catData],
  );

  return (
    <Stack spacing={3}>
      <ClubsToolbar />

      <ClubsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        catName={catName}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Club
          </Button>
        }
        onEdit={openEdit}
        onRemove={remove}
        onView={(c) => navigate(`/clubs/${c.id}`)}
      />

      <ClubFormDialog
        open={open}
        onClose={() => setOpen(false)}
        initialValues={initialValues}
        initialAdmins={initialAdmins}
        config={ADMIN_CLUB_CONFIG}
        busy={busy}
        opError={opError}
        onSubmit={submit}
        onPickImage={pickImage}
      />

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => settlePicker(null)}
        onPicked={(url) => settlePicker(url)}
        folder={pickerFolder}
        title="Add club image"
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
