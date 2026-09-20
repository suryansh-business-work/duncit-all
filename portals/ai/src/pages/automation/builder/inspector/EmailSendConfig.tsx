import { useMemo } from 'react';
import { Alert, MenuItem, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { ConfigProps } from './config-props';
import { emailSchema, str, type EmailValues } from './schemas';
import { useNodeForm } from './useNodeForm';

const toValues = (config: Record<string, unknown>): EmailValues => ({
  sender_id: str(config.sender_id),
  template_slug: str(config.template_slug),
  subject: str(config.subject),
  category: str(config.category) || 'notification',
  vars: Object.fromEntries(Object.entries((config.vars as Record<string, unknown>) ?? {}).map(([key, value]) => [key, str(value)])),
});

/**
 * Send email — which SMTP mailbox (Tech > Environment > Email), which template
 * (Tech > Email Templates), and a value for each variable the template asks for.
 */
export default function EmailSendConfig({ nodeId, config, options, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => emailSchema(), []);
  const { control, watch } = useNodeForm(nodeId, schema, toValues(config), (next) => {
    const template = options.email_templates.find((row) => row.slug === next.template_slug);
    // Only the variables the chosen template asks for travel — a switch of
    // template must not carry the old one's values along.
    const keep = new Set(template?.variables ?? []);
    const vars = Object.fromEntries(Object.entries(next.vars ?? {}).filter(([key]) => keep.has(key)));
    onChange({ ...config, ...next, vars });
  });
  const slug = watch('template_slug');
  const template = options.email_templates.find((row) => row.slug === slug) ?? null;

  return (
    <Stack spacing={2}>
      {options.email_senders.length === 0 && <Alert severity="warning">{t('ai.automation.inspector.email.noSenders')}</Alert>}
      <RhfTextField
        control={control}
        name="sender_id"
        select
        label={t('ai.automation.inspector.email.sender')}
        hint={t('ai.automation.inspector.email.senderHint')}
        size="small"
      >
        <MenuItem value="">{t('ai.automation.inspector.email.defaultSender')}</MenuItem>
        {options.email_senders.map((sender) => (
          <MenuItem key={sender.id} value={sender.id}>
            {sender.name}
            {sender.from_address ? ` — ${sender.from_address}` : ''}
          </MenuItem>
        ))}
      </RhfTextField>

      {options.email_templates.length === 0 && <Alert severity="warning">{t('ai.automation.inspector.email.noTemplates')}</Alert>}
      <RhfTextField
        control={control}
        name="template_slug"
        select
        label={t('ai.automation.inspector.email.template')}
        hint={t('ai.automation.inspector.email.templateHint')}
        size="small"
      >
        {options.email_templates.map((row) => (
          <MenuItem key={row.slug} value={row.slug}>
            {row.name}
          </MenuItem>
        ))}
      </RhfTextField>

      {template && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {template.subject}
        </Typography>
      )}
      <RhfTextField
        control={control}
        name="subject"
        label={t('ai.automation.inspector.email.subject')}
        hint={t('ai.automation.inspector.email.subjectHint')}
        size="small"
      />
      <RhfTextField
        control={control}
        name="category"
        select
        label={t('ai.automation.inspector.email.category')}
        hint={t('ai.automation.inspector.email.categoryHint')}
        size="small"
      >
        {options.email_categories.map((category) => (
          <MenuItem key={category} value={category}>
            {category}
          </MenuItem>
        ))}
      </RhfTextField>

      {(template?.variables ?? []).map((key) => (
        <RhfTextField
          key={key}
          control={control}
          name={`vars.${key}` as const}
          label={t('ai.automation.inspector.email.variable', { vars: { name: key } })}
          hint={t('ai.automation.inspector.email.variableHint')}
          size="small"
          multiline={key === 'body'}
          minRows={key === 'body' ? 3 : undefined}
        />
      ))}
    </Stack>
  );
}
