import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { parseToolConfig, parseToolFields, withDefaults } from '@duncit/challenges';
import {
  CHALLENGE_TOOLS,
  CHALLENGE_TOOL_PRESETS,
  CREATE_CHALLENGE_TOOL_PRESET,
  DUPLICATE_CHALLENGE_TOOL_PRESET,
  UPDATE_CHALLENGE_TOOL_PRESET,
  type PresetRow,
} from '../../graphql/engine';
import { PresetForm, type PresetFormValues } from '../../components/preset-form';
import PresetsTable from './PresetsTable';

type Editing = { preset: PresetRow | null } | null;

/** Challenge Portal > Tool Presets. */
export default function PresetsPage() {
  const { t } = useTranslation();
  const presetsQuery = useQuery(CHALLENGE_TOOL_PRESETS, { fetchPolicy: 'cache-and-network' });
  const toolsQuery = useQuery(CHALLENGE_TOOLS);
  const [editing, setEditing] = useState<Editing>(null);
  const [create, createState] = useMutation(CREATE_CHALLENGE_TOOL_PRESET);
  const [update, updateState] = useMutation(UPDATE_CHALLENGE_TOOL_PRESET);
  const [duplicate, duplicateState] = useMutation(DUPLICATE_CHALLENGE_TOOL_PRESET);
  const tools = useMemo(() => toolsQuery.data?.challengeTools ?? [], [toolsQuery.data]);
  const runnable = useMemo(() => tools.filter((tool) => tool.status === 'ACTIVE' && tool.engine_ready), [tools]);

  const values = useMemo<PresetFormValues | null>(() => {
    if (!editing) return null;
    const p = editing.preset;
    if (!p) return { tool_id: '', name: '', active: true, config: {} };
    const tool = tools.find((x) => x.id === p.tool_id);
    return {
      tool_id: p.tool_id,
      name: p.name,
      active: p.is_active,
      config: withDefaults(parseToolFields(tool?.config_schema_json), parseToolConfig(p.config_json)),
    };
  }, [editing, tools]);

  const save = async (v: PresetFormValues) => {
    const configJson = JSON.stringify(v.config);
    if (editing?.preset) {
      await update({ variables: { id: editing.preset.id, input: { name: v.name.trim(), config_json: configJson, is_active: v.active } } });
    } else {
      await create({ variables: { input: { tool_id: v.tool_id, name: v.name.trim(), config_json: configJson } } });
    }
    await presetsQuery.refetch();
    setEditing(null);
  };
  const copy = async (p: PresetRow) => {
    await duplicate({ variables: { id: p.id } });
    await presetsQuery.refetch();
  };
  const saveError = createState.error ?? updateState.error;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <TuneIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t('challenge.presets.title')}
        </Typography>
      </Stack>
      {presetsQuery.loading && !presetsQuery.data && <LinearProgress aria-label={t('challenge.presets.loading')} />}
      {(presetsQuery.error || duplicateState.error) && (
        <Alert severity="error">{duplicateState.error?.message ?? t('challenge.presets.loadError')}</Alert>
      )}
      {presetsQuery.data && (
        <PresetsTable
          rows={presetsQuery.data.challengeToolPresets}
          tools={tools}
          onEdit={(preset) => setEditing({ preset })}
          onDuplicate={copy}
          toolbarActions={
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ preset: null })}>
              {t('challenge.presets.create')}
            </DuncitButton>
          }
        />
      )}
      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t(editing?.preset ? 'challenge.presets.titleEdit' : 'challenge.presets.titleNew')}</DialogTitle>
        <DialogContent dividers>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError.message}
            </Alert>
          )}
          {values && (
            <PresetForm
              values={values}
              tools={editing?.preset ? tools : runnable}
              isNew={!editing?.preset}
              saving={createState.loading || updateState.loading}
              onSubmit={save}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
