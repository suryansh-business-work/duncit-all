import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Button, Card, CardContent, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import {
  CREATE_ENV_ENTRY,
  DELETE_ENV_ENTRY,
  ENV_CATEGORIES,
  ENV_ENTRIES,
  SET_DEFAULT_ENV_ENTRY,
  TEST_ENV_ENTRY,
  UPDATE_ENV_ENTRY,
  type EnvCategory,
  type EnvCategoryDef,
  type EnvEntry,
} from './queries';
import EnvEntriesTable from './EnvEntriesTable';
import { EnvEntryForm, toConfigPairs, type EnvEntryFormValues } from './env-entry';
import { notify } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { parseApiError } from '../../utils/parseApiError';

export default function EnvironmentPage() {
  const confirm = useConfirm();
  const [category, setCategory] = useState<EnvCategory>('EMAIL');
  const [editing, setEditing] = useState<EnvEntry | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: catData } = useQuery<{ envCategories: EnvCategoryDef[] }>(ENV_CATEGORIES, { fetchPolicy: 'cache-first' });
  const { data, loading, refetch } = useQuery<{ envEntries: EnvEntry[] }>(ENV_ENTRIES, {
    variables: { filter: { category } },
    fetchPolicy: 'cache-and-network',
  });
  const [createMut, createState] = useMutation(CREATE_ENV_ENTRY);
  const [updateMut, updateState] = useMutation(UPDATE_ENV_ENTRY);
  const [deleteMut] = useMutation(DELETE_ENV_ENTRY);
  const [setDefaultMut] = useMutation(SET_DEFAULT_ENV_ENTRY);
  const [testMut, testState] = useMutation(TEST_ENV_ENTRY);

  const categories = catData?.envCategories ?? [];
  const def = useMemo(() => categories.find((c) => c.category === category), [categories, category]);
  const entries = data?.envEntries ?? [];
  const busy = createState.loading || updateState.loading;

  const handleSubmit = async (values: EnvEntryFormValues) => {
    if (!def) return;
    try {
      const config = toConfigPairs(def, values);
      const base = { name: values.name.trim(), description: values.description.trim(), is_default: values.is_default, is_active: values.is_active, config };
      if (editing) {
        await updateMut({ variables: { id: editing.id, input: base } });
        notify(`${values.name} updated`, 'success');
      } else {
        await createMut({ variables: { input: { ...base, category } } });
        notify(`${values.name} created`, 'success');
      }
      setEditing(null);
      setCreating(false);
      await refetch();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleDelete = async (e: EnvEntry) => {
    if (!(await confirm({ title: 'Delete entry', message: `Delete "${e.name}"?`, destructive: true }))) return;
    try {
      await deleteMut({ variables: { id: e.id } });
      notify(`${e.name} deleted`, 'success');
      await refetch();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleSetDefault = async (e: EnvEntry) => {
    try {
      await setDefaultMut({ variables: { id: e.id } });
      notify(`${e.name} is now the default`, 'success');
      await refetch();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleTest = async (e: EnvEntry) => {
    try {
      const res = await testMut({ variables: { id: e.id } });
      const result = res.data?.testEnvEntry;
      notify(result?.message ?? 'Tested', result?.ok ? 'success' : 'error');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TuneIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Environment Variables</Typography>
          <Typography variant="body2" color="text.secondary">
            Add multiple entries per category (e.g. several Email or ImageKit accounts). Pick a default and assign them to portals from Portal Mapping.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" disabled={!def} onClick={() => setCreating(true)}>
          Add {def?.label ?? ''}
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Tabs value={category} onChange={(_, v) => setCategory(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1.5 }}>
            {categories.map((c) => <Tab key={c.category} value={c.category} label={c.label} />)}
          </Tabs>
          {loading && !entries.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={28} /></Box>
          ) : (
            <EnvEntriesTable entries={entries} onEdit={setEditing} onDelete={handleDelete} onSetDefault={handleSetDefault} onTest={handleTest} />
          )}
        </CardContent>
      </Card>

      {def && (
        <EnvEntryForm
          open={creating || !!editing}
          def={def}
          initial={editing}
          busy={busy}
          testing={testState.loading}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={handleSubmit}
          onTest={handleTest}
        />
      )}
    </Stack>
  );
}
