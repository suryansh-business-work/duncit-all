import type { ComponentType } from 'react';
import type { Edge } from '@xyflow/react';
import { Alert, Box, Divider, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { NODE_KINDS, type NodeKind } from '../../node-kinds';
import type { CanvasNode } from '../../graph-io';
import type { AutomationChannel, AutomationOptions, NodeData } from '../../types';
import { toneColor } from '../nodes/tone';
import type { ConfigProps } from './config-props';
import TriggerConfig from './TriggerConfig';
import WhatsappSendConfig from './WhatsappSendConfig';
import EmailSendConfig from './EmailSendConfig';
import { AiClassifyConfig, AiComposeConfig } from './AiConfigs';
import { ConditionConfig, SetVariableConfig } from './LogicConfigs';
import { DelayConfig, WaitConfig } from './TimingConfigs';
import HttpConfig from './HttpConfig';
import ExitConnections from './ExitConnections';
import VariableChips from './VariableChips';

/** Hoisted, so switching steps swaps components rather than redefining them. */
const CONFIG_BY_KIND: Record<NodeKind, ComponentType<ConfigProps>> = {
  trigger: TriggerConfig,
  send_whatsapp: WhatsappSendConfig,
  send_email: EmailSendConfig,
  ai_compose: AiComposeConfig,
  ai_classify: AiClassifyConfig,
  condition: ConditionConfig,
  wait_for_reply: WaitConfig,
  delay: DelayConfig,
  set_variable: SetVariableConfig,
  http_request: HttpConfig,
};

interface Props {
  node: CanvasNode | null;
  nodes: readonly CanvasNode[];
  edges: readonly Edge[];
  channel: AutomationChannel;
  options: AutomationOptions;
  onChange: (id: string, config: NodeData) => void;
  onRemove: (id: string) => void;
  onConnect: (source: string, handle: string, target: string) => void;
  onDisconnect: (source: string, handle: string) => void;
}

/** The right-hand panel: the selected step's settings, its variables and its exits. */
export default function NodeInspector({ node, nodes, edges, channel, options, onChange, onRemove, onConnect, onDisconnect }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!node) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('ai.automation.builder.inspectorTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {t('ai.automation.builder.inspectorEmpty')}
        </Typography>
      </Box>
    );
  }

  const meta = NODE_KINDS[node.data.kind];
  const Icon = meta.icon;
  const Config = CONFIG_BY_KIND[node.data.kind];
  const isTrigger = node.data.kind === 'trigger';

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="automation-inspector">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ color: toneColor(theme, meta.tone), display: 'flex', mt: 0.25 }}>
          <Icon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {t(meta.labelKey)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t(meta.hintKey)}
          </Typography>
        </Box>
        <Tooltip title={isTrigger ? t('ai.automation.builder.triggerLocked') : t('ai.automation.builder.deleteNode')}>
          <span>
            <DuncitIconButton
              size="small"
              color="error"
              disabled={isTrigger}
              aria-label={t('ai.automation.builder.deleteNode')}
              onClick={() => onRemove(node.id)}
              data-testid="automation-inspector-delete"
            >
              <DeleteOutlinedIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>

      {node.data.issues.length > 0 && (
        <Alert severity="error">
          <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2 }}>
            {node.data.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </Stack>
        </Alert>
      )}

      <Config
        key={node.id}
        nodeId={node.id}
        channel={channel}
        config={node.data.config}
        options={options}
        onChange={(config) => onChange(node.id, config)}
      />

      <Divider />
      <ExitConnections node={node} nodes={nodes} edges={edges} onConnect={onConnect} onDisconnect={onDisconnect} />
      <Divider />
      <VariableChips channel={channel} nodes={nodes} options={options} />
    </Stack>
  );
}
