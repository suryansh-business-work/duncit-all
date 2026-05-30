import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Button, Card, CardContent, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExtensionIcon from '@mui/icons-material/Extension';
import {
  CREATE_INTEGRATION_PROVIDER,
  DELETE_INTEGRATION_PROVIDER,
  INTEGRATION_PROVIDERS,
  SET_DEFAULT_INTEGRATION_PROVIDER,
  TEST_INTEGRATION_PROVIDER,
  UPDATE_INTEGRATION_PROVIDER,
  type IntegrationProvider,
  type IntegrationProviderType,
} from './queries';
import IntegrationsTable from './IntegrationsTable';
import { IntegrationProviderForm, toConfigInput, type IntegrationFormValues } from './integration-provider';
import { notify } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { parseApiError } from '../../utils/parseApiError';

const TABS: { value: 'ALL' | IntegrationProviderType; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'IMAGEKIT', label: 'ImageKit' },
  { value: 'PEXELS', label: 'Pexels' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'TWILIO', label: 'Twilio' },
  { value: 'AI', label: 'AI' },
];

export default function IntegrationsPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<'ALL' | IntegrationProviderType>('ALL');
  const [editing, setEditing] = useState<IntegrationProvider | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, loading, refetch } = useQuery<{ integrationProviders: IntegrationProvider[] }>(
    INTEGRATION_PROVIDERS,
    { variables: { filter: tab === 'ALL' ? {} : { type: tab } }, fetchPolicy: 'cache-and-network' }
  );
  const [createMut, createState] = useMutation(CREATE_INTEGRATION_PROVIDER);
  const [updateMut, updateState] = useMutation(UPDATE_INTEGRATION_PROVIDER);
  const [deleteMut] = useMutation(DELETE_INTEGRATION_PROVIDER);
  const [setDefaultMut] = useMutation(SET_DEFAULT_INTEGRATION_PROVIDER);
  const [testMut, testState] = useMutation(TEST_INTEGRATION_PROVIDER);

  const providers = data?.integrationProviders ?? [];
  const busy = createState.loading || updateState.loading;

  const handleSubmit = async (values: IntegrationFormValues) => {
    try {
      const input = {
        name: values.name.trim(),
        description: values.description.trim(),
        is_default: values.is_default,
        is_active: values.is_active,
        config: toConfigInput(values),
      };
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        notify(`${values.name} updated`, 'success');
      } else {
        await createMut({ variables: { input: { ...input, type: values.type } } });
        notify(`${values.name} created`, 'success');
      }
      setEditing(null);
      setCreating(false);
      await refetch();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleDelete = async (p: IntegrationProvider) => {
    const ok = await confirm({ title: 'Delete integration', message: `Delete "${p.name}"?`, destructive: true });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: p.id } });
      notify(`${p.name} deleted`, 'success');
      await refetch();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleSetDefault = async (p: IntegrationProvider) => {
    try {
      await setDefaultMut({ variables: { id: p.id } });
      notify(`${p.name} is now the default`, 'success');
      await refetch();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleTest = async (p: IntegrationProvider) => {
    try {
      const res = await testMut({ variables: { id: p.id } });
      const result = res.data?.testIntegrationProvider;
      notify(result?.message ?? 'Tested', result?.ok ? 'success' : 'error');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ExtensionIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Integrations</Typography>
          <Typography variant="body2" color="text.secondary">
            Multiple ImageKit, Pexels, Google, Twilio and AI accounts — each testable. SMTP and Vobiz live in Comms Providers.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>
          New integration
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1.5 }}>
            {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
          </Tabs>
          {loading && !providers.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={28} /></Box>
          ) : (
            <IntegrationsTable
              providers={providers}
              onEdit={setEditing}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onTest={handleTest}
            />
          )}
        </CardContent>
      </Card>

      <IntegrationProviderForm
        open={creating || !!editing}
        initial={editing}
        busy={busy}
        testing={testState.loading}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSubmit={handleSubmit}
        onTest={handleTest}
      />
    </Stack>
  );
}
