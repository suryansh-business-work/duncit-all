import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import type { ChallengeCategoryMapping, ChallengeCategoryMappingInput } from '@duncit/gql-types';
import { useTranslation } from '../i18n';
import {
  CHALLENGE_MAPPING_EDITOR,
  CLEAR_CHALLENGE_MAPPING,
  UPSERT_CHALLENGE_MAPPING,
  type MappingEditorData as EditorData,
} from '../queries';
import { ChallengeMappingForm } from './challenge-mapping.form';
import type { ChallengeMappingOptions, ChallengeMappingValues } from './challenge-mapping.types';

export interface ChallengeMappingEditorProps {
  categoryId: string;
  /** Called after a save or clear, e.g. to refresh a list of mappings. */
  onSaved?: () => void;
}

function toValues(m: ChallengeCategoryMapping): ChallengeMappingValues {
  return {
    enabled: m.enabled,
    allowed_tool_ids: m.allowed_tool_ids,
    preset_ids: m.preset_ids,
    default_template_id: m.default_template_id ?? '',
    allow_host_customization: m.allow_host_customization,
    show_on_pod_details_default: m.show_on_pod_details_default,
    allow_audience_voting: m.allow_audience_voting,
    require_challenge: m.require_challenge,
    max_competitors: m.max_competitors,
  };
}

function toOptions(data: EditorData, keep: string[]): ChallengeMappingOptions {
  // Inactive tools stay listed only where a category already uses them.
  const tools = data.challengeTools.filter((tool) => (tool.status === 'ACTIVE' && tool.engine_ready) || keep.includes(tool.id));
  return {
    tools: tools.map((tool) => ({ id: tool.id, label: tool.name, toolIds: [tool.id] })),
    presets: data.challengeToolPresets
      .filter((p) => p.is_active)
      .map((p) => ({ id: p.id, label: p.name, toolIds: [p.tool_id] })),
    templates: data.challenges
      .filter((c) => c.is_active)
      .map((c) => ({ id: c.id, label: c.name, toolIds: [...new Set(c.tool_instances.map((i) => i.tool_id))] })),
  };
}

/**
 * Challenge settings for one category node — the same editor in Challenge
 * Portal > Category Mapping and Admin > Categories > Challenge Tools, over the
 * same server rows. An inherited category shows its parent's values; saving
 * creates the category's own override, "Inherit from parent" removes it.
 */
export function ChallengeMappingEditor({ categoryId, onSaved }: Readonly<ChallengeMappingEditorProps>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(CHALLENGE_MAPPING_EDITOR, {
    variables: { categoryId },
    fetchPolicy: 'cache-and-network',
  });
  const [upsert, upsertState] = useMutation(UPSERT_CHALLENGE_MAPPING);
  const [clear, clearState] = useMutation(CLEAR_CHALLENGE_MAPPING);
  const mapping = data?.challengeCategoryMapping;
  const values = useMemo(() => (mapping ? toValues(mapping) : null), [mapping]);
  const options = useMemo(() => (data ? toOptions(data, mapping?.allowed_tool_ids ?? []) : null), [data, mapping]);

  if (loading && !data) return <CircularProgress size={24} aria-label={t('challenge.mapping.loading')} />;
  if (error && !data) return <Alert severity="error">{t('challenge.mapping.loadError')}</Alert>;
  if (!mapping || !values || !options) return null;

  const save = async (v: ChallengeMappingValues) => {
    const input: ChallengeCategoryMappingInput = { ...v, default_template_id: v.default_template_id || null };
    await upsert({ variables: { categoryId, input } });
    onSaved?.();
  };
  const inherit = async () => {
    await clear({ variables: { categoryId } });
    onSaved?.();
  };
  const ownRow = !!mapping.id && !mapping.inherited;
  const saveError = upsertState.error ?? clearState.error;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }} role="status">
        {mapping.inherited
          ? t('challenge.mapping.inheritedFrom')
          : t(ownRow ? 'challenge.mapping.ownRow' : 'challenge.mapping.noRow')}
      </Typography>
      {saveError && <Alert severity="error">{saveError.message}</Alert>}
      <ChallengeMappingForm
        values={values}
        options={options}
        saving={upsertState.loading || clearState.loading}
        onSubmit={save}
        onClear={ownRow ? inherit : undefined}
      />
    </Stack>
  );
}
