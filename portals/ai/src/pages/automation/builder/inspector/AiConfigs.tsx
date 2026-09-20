import { useMemo } from 'react';
import { Alert, MenuItem, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { ConfigProps } from './config-props';
import { aiClassifySchema, aiComposeSchema, str, strList, type AiClassifyValues, type AiComposeValues } from './schemas';
import { useNodeForm } from './useNodeForm';

interface PromptFieldProps {
  control: any;
  options: ConfigProps['options'];
}

/** The AI Library prompt select and the instructions — shared by both AI steps. */
function PromptFields({ control, options }: Readonly<PromptFieldProps>) {
  const { t } = useTranslation();
  return (
    <>
      <RhfTextField
        control={control}
        name="prompt_id"
        select
        label={t('ai.automation.inspector.ai.prompt')}
        hint={t('ai.automation.inspector.ai.promptHint')}
        size="small"
      >
        <MenuItem value="">{t('ai.automation.inspector.ai.none')}</MenuItem>
        {options.prompts.map((prompt) => (
          <MenuItem key={prompt.id} value={prompt.id}>
            {prompt.name}
            {prompt.category ? ` — ${prompt.category}` : ''}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField
        control={control}
        name="instructions"
        label={t('ai.automation.inspector.ai.instructions')}
        hint={t('ai.automation.inspector.ai.instructionsHint')}
        size="small"
        multiline
        minRows={4}
        required
      />
      <RhfTextField
        control={control}
        name="input"
        label={t('ai.automation.inspector.ai.input')}
        hint={t('ai.automation.inspector.ai.inputHint')}
        size="small"
      />
    </>
  );
}

export function AiComposeConfig({ nodeId, config, options, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => aiComposeSchema(t), [t]);
  const values: AiComposeValues = {
    prompt_id: str(config.prompt_id),
    instructions: str(config.instructions),
    input: str(config.input),
    output_var: str(config.output_var),
  };
  const { control } = useNodeForm(nodeId, schema, values, (next) => onChange({ ...config, ...next }));
  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('ai.automation.inspector.ai.liveNote')}</Alert>
      <PromptFields control={control} options={options} />
      <RhfTextField
        control={control}
        name="output_var"
        label={t('ai.automation.inspector.ai.output')}
        hint={t('ai.automation.inspector.ai.outputHint')}
        size="small"
        required
      />
    </Stack>
  );
}

export function AiClassifyConfig({ nodeId, config, options, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => aiClassifySchema(t), [t]);
  const values: AiClassifyValues = {
    prompt_id: str(config.prompt_id),
    instructions: str(config.instructions),
    input: str(config.input),
    labels_text: strList(config.labels).join('\n'),
  };
  const { control } = useNodeForm(nodeId, schema, values, (next) => {
    const { labels_text, ...rest } = next;
    const labels = labels_text.split('\n').map((line) => line.trim()).filter(Boolean);
    onChange({ ...config, ...rest, labels });
  });
  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('ai.automation.inspector.ai.liveNote')}</Alert>
      <PromptFields control={control} options={options} />
      <RhfTextField
        control={control}
        name="labels_text"
        label={t('ai.automation.inspector.ai.labels')}
        hint={t('ai.automation.inspector.ai.labelsHint')}
        size="small"
        multiline
        minRows={3}
        required
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('ai.automation.inspector.ai.classifyOutput')}
      </Typography>
    </Stack>
  );
}
