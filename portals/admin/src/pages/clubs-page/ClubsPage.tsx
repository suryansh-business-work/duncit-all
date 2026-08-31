import { useCallback, useRef, useState } from 'react';
import { useConfirm, notifyError } from '@duncit/dialogs';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { CLUBS_TABLE, CATEGORIES, DELETE, type ClubRow } from './queries';
import ClubsTable from './ClubsTable';
import ClubsToolbar from './ClubsToolbar';
import { useTranslation } from '@duncit/shell';

export default function ClubsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Bookmarks from before the editor became a page still point at /clubs?edit=.
  const legacyEditId = params.get('edit') ?? '';
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data: catData } = useQuery<any>(CATEGORIES);
  const [deleteMut] = useMutation<any>(DELETE);
  const confirm = useConfirm();

  const [toast, setToast] = useState<string | null>(null);
  // Page-level filter: pinned outside the table so it survives the table's own
  // column filters and resets paging when it changes.
  const [superCategoryId, setSuperCategoryId] = useState('');

  const fetchRows = useApolloTableFetch<ClubRow>(client, CLUBS_TABLE, 'clubsTable');

  const remove = async (c: ClubRow) => {
    const ok = await confirm({
      title: t('admin.clubs.deleteClub'),
      message: `Delete club "${c.club_name}"?`,
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: c.id } });
      setToast(t('shell.common.deleted'));
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const catName = useCallback(
    (id: string) => (catData?.categories ?? []).find((c: any) => c.id === id)?.name ?? '—',
    [catData],
  );

  if (legacyEditId) return <Navigate to={`/clubs/${legacyEditId}/edit`} replace />;

  return (
    <Stack spacing={3}>
      <ClubsToolbar
        superCategoryId={superCategoryId}
        onSuperCategoryChange={setSuperCategoryId}
      />

      <ClubsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        superCategoryId={superCategoryId}
        catName={catName}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/clubs/new')}
          >
            New Club
          </DuncitButton>
        }
        onEdit={(c) => navigate(`/clubs/${c.id}/edit`)}
        onRemove={remove}
        onView={(c) => navigate(`/clubs/${c.id}`)}
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
