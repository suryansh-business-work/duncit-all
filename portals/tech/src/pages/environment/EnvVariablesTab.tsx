import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import {
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
import EnvImportExport from './EnvImportExport';
import { EnvEntryForm, toConfigPairs, type EnvEntryFormValues } from './env-entry';
import TestDrawer from './test-panels';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';

/** Manage the named entries within each environment category. */
export default function EnvVariablesTab() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<EnvEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<EnvEntry | null>(null);

  const { data: catData } = useQuery<{ envCategories: EnvCategoryDef[] }>(ENV_CATEGORIES, { fetchPolicy: 'cache-first' });
  const [createMut, createState] = useMutation<any>(CREATE_ENV_ENTRY);
  const [updateMut, updateState] = useMutation<any>(UPDATE_ENV_ENTRY);
  const [deleteMut] = useMutation<any>(DELETE_ENV_ENTRY);
  const [setDefaultMut] = useMutation<any>(SET_DEFAULT_ENV_ENTRY);

  // The server's catalogue is the ONLY source of tabs and form fields, so a
  // category added server-side shows up here with no portal change.
  const categories = catData?.envCategories ?? [];
  // Its own key: the page's Variables/Portal Mapping strip already owns
  // `selectedtab`. Until the catalogue lands there is nothing to match, so the
  // first server category stands in — including for a link naming a category.
  const tabs = useTabParam<EnvCategory>({
    items: categories.map((c) => ({ value: c.category, label: c.label })),
    fallback: categories[0]?.category ?? '',
    param: 'selectedtab_category',
  });
  const active = tabs.value;

  // Server-paged rows for the active category tab; the tab pins a category filter.
  const fetchRows = useApolloTableFetch<EnvEntry>(
    client,
    ENV_ENTRIES_TABLE,
    'envEntriesTable',
    { extraFilters: [{ field: 'category', op: 'eq', value: active }] },
    [active],
  );

  const def = useMemo(() => categories.find((c) => c.category === active), [categories, active]);
  const busy = createState.loading || updateState.loading;

  // No catalogue yet (first load / API briefly unavailable): nothing can be
  // rendered without the server's definitions, so show progress instead.
  if (!def) return <LinearProgress />;

  const handleSubmit = async (values: EnvEntryFormValues) => {
    try {
      const config = toConfigPairs(def, values);
      const base = { name: values.name.trim(), description: values.description.trim(), is_default: values.is_default, is_active: values.is_active, config };
      if (editing) {
        await updateMut({ variables: { id: editing.id, input: base } });
        notify(`${values.name} updated`, 'success');
      } else {
        await createMut({ variables: { input: { ...base, category: active } } });
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
    if (!(await confirm({ title: t('tech.environment.deleteEntry'), message: `Delete "${e.name}"?`, destructive: true }))) return;
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
      {/* Above the tabs, not in the table toolbar: these two act on whole
          categories, so sitting among the row actions read as if they were
          about the rows. The warning travels with them because the file they
          produce is the most dangerous thing this page can hand out. */}
      <Alert
        severity="warning"
        variant="outlined"
        action={
          <EnvImportExport
            category={active}
            categoryLabel={def.label}
            onImported={() => {
              // The import can touch categories other than the tab in view, so
              // the whole cache goes rather than just this table's page.
              client.resetStore().catch(() => undefined);
              refetchRef.current?.();
            }}
          />
        }
        sx={{ alignItems: 'center', '& .MuiAlert-action': { pt: 0, alignItems: 'center' } }}
      >
        Sensitive — an exported file holds the real keys and secrets in plain text. Treat it like a
        password: do not share it, and delete it once you are done.
      </Alert>

      <DuncitTabs {...tabs} variant="scrollable" scrollButtons="auto" />
      {/* key remounts the table per category so the page/query state resets with the tab. */}
      <EnvEntriesTable
        key={active}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton size="small" startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>
            Add {def.label}
          </DuncitButton>
        }
        onEdit={setEditing}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        onTest={setTesting}
      />

      <EnvEntryForm
        open={creating || !!editing}
        def={def}
        initial={editing}
        busy={busy}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSubmit={handleSubmit}
        onTest={(e) => { setEditing(null); setTesting(e); }}
      />


      <TestDrawer entry={testing} onClose={() => setTesting(null)} />
    </Stack>
  );
}
