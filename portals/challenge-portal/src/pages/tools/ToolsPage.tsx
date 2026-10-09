import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import { useTranslation } from '@duncit/shell';
import { parseToolConfig, parseToolFields, withDefaults } from '@duncit/challenges';
import { CHALLENGE_TOOLS, SET_CHALLENGE_TOOL_CATEGORIES, UPDATE_CHALLENGE_TOOL, type ToolRow } from '../../graphql/engine';
import { useCategoryPaths } from '../../lib/categoryPaths';
import { ToolForm, type ToolFormValues } from '../../components/tool-form';
import ToolsTable from './ToolsTable';

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/** Challenge Portal > Tool Master. */
export default function ToolsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(CHALLENGE_TOOLS, { fetchPolicy: 'cache-and-network' });
  const { options: categories } = useCategoryPaths();
  const [editing, setEditing] = useState<ToolRow | null>(null);
  const [updateTool, updateState] = useMutation(UPDATE_CHALLENGE_TOOL);
  const [setCategories, categoriesState] = useMutation(SET_CHALLENGE_TOOL_CATEGORIES);

  const fields = useMemo(() => parseToolFields(editing?.config_schema_json), [editing]);
  const values = useMemo<ToolFormValues | null>(
    () =>
      editing && {
        name: editing.name,
        description: editing.description,
        active: editing.status === 'ACTIVE',
        config: withDefaults(fields, parseToolConfig(editing.default_config_json)),
        category_ids: editing.mapped_category_ids,
      },
    [editing, fields]
  );

  const save = async (v: ToolFormValues) => {
    if (!editing) return;
    await updateTool({
      variables: {
        id: editing.id,
        input: {
          name: v.name.trim(),
          description: v.description,
          status: v.active ? 'ACTIVE' : 'INACTIVE',
          default_config_json: editing.engine_ready ? JSON.stringify(v.config) : null,
        },
      },
    });
    if (!sameSet(v.category_ids, editing.mapped_category_ids)) {
      await setCategories({ variables: { toolId: editing.id, categoryIds: v.category_ids } });
    }
    await refetch();
    setEditing(null);
  };
  const saveError = updateState.error ?? categoriesState.error;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <HandymanIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t('challenge.tools.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('challenge.tools.subtitle')}
      </Typography>
      {loading && !data && <LinearProgress aria-label={t('challenge.tools.loading')} />}
      {error && !data && <Alert severity="error">{t('challenge.tools.loadError')}</Alert>}
      {data && <ToolsTable rows={data.challengeTools} onEdit={setEditing} />}

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('challenge.tools.dialogTitle', { vars: { name: editing?.name ?? '' } })}</DialogTitle>
        <DialogContent dividers>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError.message}
            </Alert>
          )}
          {editing && values && (
            <ToolForm
              values={values}
              fields={fields}
              engineReady={editing.engine_ready}
              categories={categories}
              saving={updateState.loading || categoriesState.loading}
              onSubmit={save}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
