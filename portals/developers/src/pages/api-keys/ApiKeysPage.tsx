import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CreateKeyDialog from './CreateKeyDialog';
import { CREATE_API_KEY, MY_API_KEYS, REVOKE_API_KEY, type ApiKeyRow } from './queries';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export default function ApiKeysPage() {
  const { data, loading, error, refetch } = useQuery(MY_API_KEYS, { fetchPolicy: 'cache-and-network' });
  const [createKey, createState] = useMutation(CREATE_API_KEY);
  const [revokeKey] = useMutation(REVOKE_API_KEY);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const keys: ApiKeyRow[] = data?.myApiKeys ?? [];

  const onCreate = async (name: string) => {
    setOpError(null);
    try {
      const { data: created } = await createKey({ variables: { name } });
      setRawKey(created?.createApiKey?.raw_key ?? null);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    }
  };

  const onRevoke = async (id: string) => {
    setOpError(null);
    try {
      await revokeKey({ variables: { id } });
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={900}>
            API Keys
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Authenticate /api/v1 requests with the x-api-key header.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Create key
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {opError && <Alert severity="error">{opError}</Alert>}

      {loading && keys.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Key</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Scopes</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Last used</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No API keys yet — create one to start calling the venue APIs.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {keys.map((key) => (
                <TableRow key={key.id} hover>
                  <TableCell>{key.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{key.key_prefix}…</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {key.scopes.map((scope) => (
                        <Chip key={scope} size="small" label={scope} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{fmt(key.created_at)}</TableCell>
                  <TableCell>{fmt(key.last_used_at)}</TableCell>
                  <TableCell>
                    {key.revoked_at ? (
                      <Chip size="small" color="default" label="Revoked" />
                    ) : (
                      <Chip size="small" color="success" label="Active" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {!key.revoked_at && (
                      <Button size="small" color="error" onClick={() => onRevoke(key.id)}>
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

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
