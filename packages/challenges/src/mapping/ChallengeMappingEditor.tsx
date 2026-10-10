import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import type { ChallengeCategoryMapping, ChallengeCategoryMappingInput } from '@duncit/gql-types';
import { useTranslation } from '../i18n';
import { CHALLENGE_MAPPING_EDITOR, UPSERT_CHALLENGE_MAPPING, type MappingEditorData as EditorData } from '../queries';
import { ChallengeMappingForm } from './challenge-mapping.form';
import type { ChallengeMappingOptions, ChallengeMappingValues } from './challenge-mapping.types';

export interface ChallengeMappingEditorProps {
  /** A SUB-category: challenge tools are chosen per sub-category and nowhere else. */
  categoryId: string;
  /** Called after a save, e.g. to refresh a list of mappings. */
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
 * Challenge settings for one sub-category — the same editor in Admin >
 * Categories > edit sub-category and Challenge Portal > Category Mapping, over
 * the same server rows Tool Master's "Mapped sub-categories" writes. Nothing is
 * inherited: a sub-category runs exactly the tools chosen here.
 */
export function ChallengeMappingEditor({ categoryId, onSaved }: Readonly<ChallengeMappingEditorProps>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(CHALLENGE_MAPPING_EDITOR, {
    variables: { categoryId },
    fetchPolicy: 'cache-and-network',
  });
  const [upsert, upsertState] = useMutation(UPSERT_CHALLENGE_MAPPING);
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

  return (
    <Stack spacing={2}>
      {upsertState.error && <Alert severity="error">{upsertState.error.message}</Alert>}
      <ChallengeMappingForm values={values} options={options} saving={upsertState.loading} onSubmit={save} />
    </Stack>
  );
}
