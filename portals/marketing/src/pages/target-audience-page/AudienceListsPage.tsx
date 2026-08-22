import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { getAudienceListColumns } from './audience-list-columns';
import { AUDIENCE_LISTS_TABLE, DELETE_AUDIENCE_LIST } from './queries';
import type { AudienceListRow } from './helpers';

const getRowId = (row: AudienceListRow) => row.id;

/** The Target Audience landing page: the saved lists, and a way to make one. */
export default function AudienceListsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);
  const [target, setTarget] = useState<AudienceListRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteList, { loading: deleting }] = useMutation(DELETE_AUDIENCE_LIST);

  const fetchRows = useApolloTableFetch<AudienceListRow>(
    client,
    AUDIENCE_LISTS_TABLE,
    'audienceListsTable',
  );

  const openList = useCallback((row: AudienceListRow) => navigate(`/audience/${row.id}`), [navigate]);

  const columns = useMemo(
    () => getAudienceListColumns({ formatDate: formatDateTime, onDelete: setTarget }, t),
    [t, formatDateTime],
  );

  const confirmDelete = async (list: AudienceListRow) => {
    setError(null);
    try {
      await deleteList({ variables: { id: list.id } });
    } catch (e) {
      setError(parseApiError(e, 'Could not delete the list'));
      return;
    }
    notifySuccess(`“${list.name}” deleted`);
    setTarget(null);
    refetchRef.current?.();
  };

  const closeConfirm = () => {
    setTarget(null);
    setError(null);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={2}>
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Target Audience
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Saved audience lists. Each one stores its filters, so its members stay current as people
            join and change.
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/audience/new')}
        >
          Create list
        </Button>
      </Stack>

      <DuncitTable<AudienceListRow>
        tableId="marketing-audience-lists"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={openList}
        refetchRef={refetchRef}
        emptyText={t('marketing.targetAudience.noAudienceListsYetCreateOne')}
        searchPlaceholder="Search lists by name, description or owner"
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />

      {/* Rendered only when a list is picked, so the handler needs no null
          guard for a state the dialog can never be confirmed in. */}
      {target && (
        <ConfirmDialog
          open
          title={t('marketing.targetAudience.deleteThisAudienceList')}
          message={
            error ??
            `“${target.name}” will be removed. The people in it are not affected — a list only stores filters.`
          }
          confirmLabel={t('shell.common.delete')}
          confirmColor="error"
          loading={deleting}
          busyLabel="Deleting…"
          onClose={closeConfirm}
          onConfirm={() => confirmDelete(target)}
        />
      )}
    </Box>
  );
}
