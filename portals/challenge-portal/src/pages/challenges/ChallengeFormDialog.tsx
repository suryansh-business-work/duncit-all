import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, LinearProgress } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { parseToolConfig, parseToolFields, withDefaults } from '@duncit/challenges';
import { CHALLENGE_STATS, CREATE_CHALLENGE, UPDATE_CHALLENGE, type Challenge } from '../../graphql/challenges';
import { CHALLENGE_TOOLS, CHALLENGE_TOOL_PRESETS } from '../../graphql/engine';
import { TemplateForm, TOTAL_KEY, type TemplateFormValues } from '../../components/template-form';

interface Props {
  open: boolean;
  /** When set, the dialog edits this template; otherwise it creates a new one. */
  editing: Challenge | null;
  onClose: () => void;
  /** Called after a successful create/update (e.g. to reload the table). */
  onSaved?: () => void;
}

const asDirection = (d: string): 'ASC' | 'DESC' => (d === 'ASC' ? 'ASC' : 'DESC');

/** Create or edit a challenge template: identity, scope, tools and winner rules. */
export default function ChallengeFormDialog({ open, editing, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const toolsQuery = useQuery(CHALLENGE_TOOLS, { skip: !open });
  const presetsQuery = useQuery(CHALLENGE_TOOL_PRESETS, { skip: !open });
  const refetchQueries = [{ query: CHALLENGE_STATS }];
  const [createChallenge, createState] = useMutation(CREATE_CHALLENGE, { refetchQueries });
  const [updateChallenge, updateState] = useMutation(UPDATE_CHALLENGE, { refetchQueries });
  const tools = useMemo(() => toolsQuery.data?.challengeTools ?? [], [toolsQuery.data]);
  const loading = createState.loading || updateState.loading;
  const error = createState.error ?? updateState.error;

  const values = useMemo<TemplateFormValues>(() => {
    const fieldsOf = (toolId: string) => parseToolFields(tools.find((tool) => tool.id === toolId)?.config_schema_json);
    const rules = editing?.winner_rules;
    return {
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      super_id: editing?.super_category_id ?? '',
      category_id: editing?.category_id ?? '',
      sub_id: editing?.sub_category_id ?? '',
      participant_mode: editing?.participant_mode === 'TEAM' ? 'TEAM' : 'INDIVIDUAL',
      tool_instances: (editing?.tool_instances ?? []).map((i) => ({
        instance_id: i.instance_id,
        tool_id: i.tool_id,
        tool_type: i.tool_type,
        preset_id: i.preset_id ?? '',
        label: i.label,
        config: withDefaults(fieldsOf(i.tool_id), parseToolConfig(i.config_json)),
      })),
      winner_rules: {
        rank_by: rules?.rank_by ?? TOTAL_KEY,
        direction: asDirection(rules?.direction ?? 'DESC'),
        tie_breakers: (rules?.tie_breakers ?? []).map((k) => ({ rank_by: k.rank_by, direction: asDirection(k.direction) })),
        podium_size: rules?.podium_size ?? 3,
      },
    };
  }, [editing, tools]);

  const submit = async (v: TemplateFormValues) => {
    const input = {
      name: v.name.trim(),
      description: v.description,
      super_category_id: v.super_id || null,
      category_id: v.category_id || null,
      sub_category_id: v.sub_id || null,
      participant_mode: v.participant_mode,
      tool_instances: v.tool_instances.map((i) => ({
        instance_id: i.instance_id,
        tool_id: i.tool_id,
        preset_id: i.preset_id || null,
        label: i.label.trim(),
        config_json: JSON.stringify(i.config),
      })),
      winner_rules: v.winner_rules,
    };
    if (editing) {
      await updateChallenge({ variables: { id: editing.id, input } });
    } else {
      await createChallenge({ variables: { input } });
    }
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{editing ? t('challenge.form.titleEdit') : t('challenge.form.titleNew')}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}
        {(toolsQuery.loading || presetsQuery.loading) && !toolsQuery.data ? (
          <LinearProgress aria-label={t('challenge.templates.loading')} />
        ) : (
          <TemplateForm
            values={values}
            tools={tools}
            presets={presetsQuery.data?.challengeToolPresets ?? []}
            saving={loading}
            onSubmit={submit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
