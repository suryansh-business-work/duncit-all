import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button, Stack, Tab, Tabs } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import {
  CATEGORY_DEFS,
  CREATE_ENV_ENTRY,
  DELETE_ENV_ENTRY,
  ENV_CATEGORIES,
  ENV_ENTRIES_TABLE,
  SET_DEFAULT_ENV_ENTRY,
  UPDATE_ENV_ENTRY,
  type EnvCategory,
  type EnvCategoryDef,
  type EnvEntry,
} from './queries';
import EnvEntriesTable from './EnvEntriesTable';
import { EnvEntryForm, toConfigPairs, type EnvEntryFormValues } from './env-entry';
import TestDrawer from './test-panels';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

/** Manage the named entries within each environment category. */
export default function EnvVariablesTab() {
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [category, setCategory] = useState<EnvCategory>('EMAIL');
  const [editing, setEditing] = useState<EnvEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<EnvEntry | null>(null);

  const { data: catData } = useQuery<{ envCategories: EnvCategoryDef[] }>(ENV_CATEGORIES, { fetchPolicy: 'cache-first' });
  const [createMut, createState] = useMutation(CREATE_ENV_ENTRY);
  const [updateMut, updateState] = useMutation(UPDATE_ENV_ENTRY);
  const [deleteMut] = useMutation(DELETE_ENV_ENTRY);
  const [setDefaultMut] = useMutation(SET_DEFAULT_ENV_ENTRY);

  // Server-paged rows for the active category tab; the tab pins a category filter.
  const fetchRows = useApolloTableFetch<EnvEntry>(
    client,
    ENV_ENTRIES_TABLE,
    'envEntriesTable',
    { extraFilters: [{ field: 'category', op: 'eq', value: category }] },
    [category],
  );

  // Prefer the server definition (authoritative); fall back to the static one so
  // the tabs, Add button and form always work even if the query hasn't loaded.
  const categories = catData?.envCategories ?? [];
  const def = useMemo(
    () => categories.find((c) => c.category === category) ?? CATEGORY_DEFS.find((c) => c.category === category),
    [categories, category]
  );
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
      refetchRef.current?.();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleDelete = async (e: EnvEntry) => {
    if (!(await confirm({ title: 'Delete entry', message: `Delete "${e.name}"?`, destructive: true }))) return;
    try {
      await deleteMut({ variables: { id: e.id } });
      notify(`${e.name} deleted`, 'success');
      refetchRef.current?.();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleSetDefault = async (e: EnvEntry) => {
    try {
      await setDefaultMut({ variables: { id: e.id } });
      notify(`${e.name} is now the default`, 'success');
      refetchRef.current?.();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={2}>
      <Tabs value={category} onChange={(_, v) => setCategory(v)} variant="scrollable" scrollButtons="auto">
        {CATEGORY_DEFS.map((c) => <Tab key={c.category} value={c.category} label={c.label} />)}
      </Tabs>
      {/* key remounts the table per category so the page/query state resets with the tab. */}
      <EnvEntriesTable
        key={category}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>
            Add {def?.label ?? ''}
          </Button>
        }
        onEdit={setEditing}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        onTest={setTesting}
      />

      {def && (
        <EnvEntryForm
          open={creating || !!editing}
          def={def}
          initial={editing}
          busy={busy}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={handleSubmit}
          onTest={(e) => { setEditing(null); setTesting(e); }}
        />
      )}

      <TestDrawer entry={testing} onClose={() => setTesting(null)} />
    </Stack>
  );
}
