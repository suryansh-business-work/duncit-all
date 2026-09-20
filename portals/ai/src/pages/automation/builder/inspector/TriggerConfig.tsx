import { useMemo } from 'react';
import { Alert, InputAdornment, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { TRIGGER_LABEL_KEYS } from '../../node-kinds';
import type { ConfigProps } from './config-props';
import { str, triggerSchema, type TriggerValues } from './schemas';
import { useNodeForm } from './useNodeForm';

const TRIGGERS = { WHATSAPP: ['INBOUND_MESSAGE', 'MANUAL'], EMAIL: ['INBOUND_EMAIL', 'MANUAL'] } as const;

export default function TriggerConfig({ nodeId, channel, config, options, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => triggerSchema(), []);
  const values: TriggerValues = { trigger: str(config.trigger), keywords: str(config.keywords), mailbox: str(config.mailbox) };
  const { control, watch } = useNodeForm(nodeId, schema, values, (next) => onChange({ ...config, ...next }));
  const trigger = watch('trigger');

  const copyWebhook = () => {
    navigator.clipboard
      .writeText(options.webhook_url)
      .then(() => notifySuccess(t('ai.automation.builder.copied', { vars: { name: t('ai.automation.inspector.trigger.webhook') } })))
      .catch(() => undefined);
  };

  return (
    <Stack spacing={2}>
      <RhfTextField control={control} name="trigger" select label={t('ai.automation.inspector.trigger.kind')} size="small">
        {TRIGGERS[channel].map((value) => (
          <MenuItem key={value} value={value}>
            {t(TRIGGER_LABEL_KEYS[value])}
          </MenuItem>
        ))}
      </RhfTextField>

      {trigger === 'INBOUND_EMAIL' && (
        <RhfTextField
          control={control}
          name="mailbox"
          select
          label={t('ai.automation.inspector.trigger.mailbox')}
          hint={t('ai.automation.inspector.trigger.mailboxHint')}
          size="small"
        >
          {options.mailboxes.map((mailbox) => (
            <MenuItem key={mailbox.email} value={mailbox.email}>
              {mailbox.display_name ? `${mailbox.display_name} — ${mailbox.email}` : mailbox.email}
              {mailbox.is_active ? '' : ` ${t('ai.automation.inspector.trigger.mailboxPaused')}`}
            </MenuItem>
          ))}
        </RhfTextField>
      )}
      {trigger === 'INBOUND_EMAIL' && options.mailboxes.length === 0 && (
        <Alert severity="warning">{t('ai.automation.inspector.trigger.mailboxNone')}</Alert>
      )}

      {trigger !== 'MANUAL' && (
        <RhfTextField
          control={control}
          name="keywords"
          label={t('ai.automation.inspector.trigger.keywords')}
          hint={t('ai.automation.inspector.trigger.keywordsHint')}
          size="small"
          multiline
          minRows={2}
        />
      )}

      {trigger === 'INBOUND_MESSAGE' && (
        <>
          <TextField
            label={t('ai.automation.inspector.trigger.webhook')}
            value={options.webhook_url}
            size="small"
            fullWidth
            helperText={t('ai.automation.inspector.trigger.webhookHint')}
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={t('ai.automation.inspector.trigger.copyWebhook')}>
                      <span>
                        <DuncitIconButton size="small" aria-label={t('ai.automation.inspector.trigger.copyWebhook')} onClick={copyWebhook}>
                          <ContentCopyIcon fontSize="small" />
                        </DuncitIconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
          {!options.webhook_secret_set && <Alert severity="warning">{t('ai.automation.inspector.trigger.webhookSecretMissing')}</Alert>}
        </>
      )}

      {trigger === 'MANUAL' && <Alert severity="info">{t('ai.automation.inspector.trigger.manualHint')}</Alert>}
    </Stack>
  );
}
