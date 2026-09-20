import { useMemo } from 'react';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { CanvasNode } from '../../graph-io';
import type { AutomationChannel, AutomationOptions } from '../../types';

interface Props {
  channel: AutomationChannel;
  nodes: readonly CanvasNode[];
  options: AutomationOptions;
}

interface Variable {
  name: string;
  description: string;
}

/**
 * Every {{variable}} a text field may use, gathered from three places: the
 * run's own context, the account fields the platform resolves per contact, and
 * whatever earlier steps on this canvas store. A click copies the token.
 */
export default function VariableChips({ channel, nodes, options }: Readonly<Props>) {
  const { t } = useTranslation();

  const variables = useMemo<Variable[]>(() => {
    const base: Variable[] = [
      { name: 'contact.name', description: t('ai.automation.variables.contactName') },
      channel === 'WHATSAPP'
        ? { name: 'contact.phone', description: t('ai.automation.variables.contactPhone') }
        : { name: 'contact.email', description: t('ai.automation.variables.contactEmail') },
      { name: 'message.text', description: t('ai.automation.variables.messageText') },
      ...(channel === 'EMAIL' ? [{ name: 'message.subject', description: t('ai.automation.variables.messageSubject') }] : []),
      { name: 'now', description: t('ai.automation.variables.now') },
      { name: 'flow.name', description: t('ai.automation.variables.flowName') },
    ];
    const profile = options.variables.map((row) => ({ name: row.name, description: `${row.description} ${t('ai.automation.variables.profile')}` }));
    const stored: Variable[] = [];
    for (const node of nodes) {
      const { kind, config } = node.data;
      const output = String(config.output_var ?? '').trim();
      if (kind === 'ai_compose' && output) stored.push({ name: output, description: t('ai.automation.kinds.ai_compose') });
      if (kind === 'http_request' && output) stored.push({ name: output, description: t('ai.automation.kinds.http_request') });
      if (kind === 'ai_classify') stored.push({ name: 'intent', description: t('ai.automation.variables.intent') });
      const name = String(config.name ?? '').trim();
      if (kind === 'set_variable' && name) stored.push({ name, description: t('ai.automation.kinds.set_variable') });
    }
    const seen = new Set<string>();
    return [...base, ...stored, ...profile].filter((row) => (seen.has(row.name) ? false : seen.add(row.name)));
  }, [channel, nodes, options.variables, t]);

  const copy = (name: string) => {
    const token = `{{${name}}}`;
    navigator.clipboard
      .writeText(token)
      .then(() => notifySuccess(t('ai.automation.builder.copied', { vars: { name: token } })))
      .catch(() => undefined);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('ai.automation.builder.variablesTitle')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        {t('ai.automation.builder.variablesHint')}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
        {variables.map((row) => (
          <Tooltip key={row.name} title={row.description}>
            <Chip size="small" variant="outlined" label={`{{${row.name}}}`} onClick={() => copy(row.name)} sx={{ fontFamily: 'monospace' }} />
          </Tooltip>
        ))}
      </Stack>
    </Box>
  );
}
