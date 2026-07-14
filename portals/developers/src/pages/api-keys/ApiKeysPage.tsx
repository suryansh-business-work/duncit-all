import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import CreateKeyDialog from './CreateKeyDialog';
import ApiKeysTable from './ApiKeysTable';
import { CREATE_API_KEY, MY_API_KEYS_TABLE, REVOKE_API_KEY, type ApiKeyRow } from './queries';

export default function ApiKeysPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createKey, createState] = useMutation(CREATE_API_KEY);
  const [revokeKey] = useMutation(REVOKE_API_KEY);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: MY_API_KEYS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.myApiKeysTable.rows as ApiKeyRow[],
        total: data.myApiKeysTable.total as number,
      };
    },
    [client],
  );

  const onCreate = async (name: string) => {
    setOpError(null);
    try {
      const { data: created } = await createKey({ variables: { name } });
      setRawKey(created?.createApiKey?.raw_key ?? null);
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    }
  };

  const onRevoke = async (key: ApiKeyRow) => {
    setOpError(null);
    try {
      await revokeKey({ variables: { id: key.id } });
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          API Keys
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Authenticate /api/v1 requests with the x-api-key header.
        </Typography>
      </Box>

      {opError && <Alert severity="error">{opError}</Alert>}

      <ApiKeysTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Create key
          </Button>
        }
        onRevoke={onRevoke}
      />

      <CreateKeyDialog
        open={dialogOpen}
        busy={createState.loading}
        rawKey={rawKey}
        error={opError}
        onCreate={onCreate}
        onClose={() => {
          setDialogOpen(false);
          setRawKey(null);
        }}
      />
    </Stack>
  );
}
