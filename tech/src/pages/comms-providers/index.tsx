import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ForumIcon from '@mui/icons-material/Forum';
import {
  COMMS_PROVIDERS,
  CREATE_COMMS_PROVIDER,
  DELETE_COMMS_PROVIDER,
  SET_DEFAULT_COMMS_PROVIDER,
  TEST_COMMS_PROVIDER,
  UPDATE_COMMS_PROVIDER,
  type CommsProvider,
  type CommsProviderType,
} from './queries';
import ProvidersTable from './ProvidersTable';
import ProviderDialog from './ProviderDialog';
import { parseApiError } from '../../utils/parseApiError';

const TABS: { value: 'ALL' | CommsProviderType; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SMTP', label: 'SMTP' },
  { value: 'VOBIZ_EMAIL', label: 'Vobiz Email' },
  { value: 'VOBIZ_CALL', label: 'Vobiz Call' },
];

export default function CommsProvidersPage() {
  const [tab, setTab] = useState<'ALL' | CommsProviderType>('ALL');
  const [editing, setEditing] = useState<CommsProvider | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testTarget, setTestTarget] = useState<{ provider: CommsProvider; recipient: string } | null>(null);

  const { data, loading, refetch } = useQuery<{ commsProviders: CommsProvider[] }>(COMMS_PROVIDERS, {
    variables: { filter: tab === 'ALL' ? {} : { type: tab } },
    fetchPolicy: 'cache-and-network',
  });
  const [createMut, createState] = useMutation(CREATE_COMMS_PROVIDER);
  const [updateMut, updateState] = useMutation(UPDATE_COMMS_PROVIDER);
  const [deleteMut] = useMutation(DELETE_COMMS_PROVIDER);
  const [setDefault] = useMutation(SET_DEFAULT_COMMS_PROVIDER);
  const [testMut, testState] = useMutation(TEST_COMMS_PROVIDER);

  const providers = data?.commsProviders ?? [];
  const busy = createState.loading || updateState.loading;

  const handleSubmit = async (input: any) => {
    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        setToast(`${input.name} updated`);
      } else {
        await createMut({ variables: { input } });
        setToast(`${input.name} created`);
      }
      setEditing(null);
      setCreating(false);
      await refetch();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleDelete = async (p: CommsProvider) => {
    try {
      await deleteMut({ variables: { id: p.id } });
      setToast(`${p.name} deleted`);
      await refetch();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleSetDefault = async (p: CommsProvider) => {
    try {
      await setDefault({ variables: { id: p.id } });
      setToast(`${p.name} is now the default`);
      await refetch();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleTest = async () => {
    if (!testTarget) return;
    try {
      const res = await testMut({ variables: { id: testTarget.provider.id, recipient: testTarget.recipient } });
      setToast(res.data?.testCommsProvider?.message ?? 'Test sent');
      setTestTarget(null);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ForumIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Communication Providers</Typography>
          <Typography variant="body2" color="text.secondary">
            Store multiple SMTP and Vobiz configurations. CRM picks which one to use when sending an email or placing a call.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>
          New provider
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 1.5 }}>
            {TABS.map((t) => (
              <Tab key={t.value} value={t.value} label={t.label} />
            ))}
          </Tabs>
          {loading && !providers.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={28} /></Box>
          ) : (
            <ProvidersTable
              providers={providers}
              onEdit={setEditing}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onTest={(p) => setTestTarget({ provider: p, recipient: '' })}
            />
          )}
        </CardContent>
      </Card>

      <ProviderDialog
        open={creating || !!editing}
        initial={editing}
        busy={busy}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} message={toast ?? ''} />

      {testTarget && (
        <Alert
          severity="info"
          icon={false}
          sx={{ position: 'fixed', bottom: 24, right: 24, maxWidth: 360, boxShadow: 8 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setTestTarget(null)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={handleTest} disabled={testState.loading || !testTarget.recipient}>
                Send
              </Button>
            </Stack>
          }
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              Test {testTarget.provider.name}
            </Typography>
            <TextField
              size="small"
              placeholder={testTarget.provider.type === 'VOBIZ_CALL' ? '+919876543210' : 'someone@example.com'}
              value={testTarget.recipient}
              onChange={(e) => setTestTarget({ ...testTarget, recipient: e.target.value })}
            />
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
