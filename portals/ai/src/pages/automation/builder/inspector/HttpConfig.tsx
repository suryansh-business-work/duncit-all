import { useMemo } from 'react';
import { Alert, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { ConfigProps } from './config-props';
import { HTTP_METHODS, httpSchema, str, type HttpValues } from './schemas';
import { useNodeForm } from './useNodeForm';

export default function HttpConfig({ nodeId, config, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => httpSchema(t), [t]);
  const values: HttpValues = {
    method: str(config.method) === 'GET' ? 'GET' : 'POST',
    url: str(config.url),
    body: str(config.body),
    output_var: str(config.output_var) || 'webhook',
  };
  const { control, watch } = useNodeForm(nodeId, schema, values, (next) => onChange({ ...config, ...next }));
  const method = watch('method');
  return (
    <Stack spacing={2}>
      <RhfTextField control={control} name="method" select label={t('ai.automation.inspector.http.method')} size="small">
        {HTTP_METHODS.map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField
        control={control}
        name="url"
        label={t('ai.automation.inspector.http.url')}
        hint={t('ai.automation.inspector.http.urlHint')}
        size="small"
        required
      />
      {method === 'POST' && (
        <RhfTextField
          control={control}
          name="body"
          label={t('ai.automation.inspector.http.body')}
          hint={t('ai.automation.inspector.http.bodyHint')}
          size="small"
          multiline
          minRows={4}
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
        />
      )}
      <RhfTextField control={control} name="output_var" label={t('ai.automation.inspector.http.output')} size="small" />
      <Alert severity="info">{t('ai.automation.inspector.http.testNote')}</Alert>
    </Stack>
  );
}
