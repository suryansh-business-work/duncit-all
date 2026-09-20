import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Edge } from '@xyflow/react';
import { useTranslation } from '@duncit/shell';
import { NODE_KINDS } from '../../node-kinds';
import { exitsOf, type CanvasNode } from '../../graph-io';
import { exitLabel } from '../nodes/ExitHandles';
import { summaryOf } from '../nodes/node-summary';

interface Props {
  node: CanvasNode;
  nodes: readonly CanvasNode[];
  edges: readonly Edge[];
  onConnect: (source: string, handle: string, target: string) => void;
  onDisconnect: (source: string, handle: string) => void;
}

/**
 * Where each exit of the selected step leads, as a select per exit.
 *
 * The same arrows a pointer draws on the canvas, reachable from the keyboard —
 * React Flow's drag-to-connect has no keyboard equivalent, and a flow that can
 * only be wired with a mouse fails 2.1.1. It is also simply the precise way to
 * wire a busy canvas.
 */
export default function ExitConnections({ node, nodes, edges, onConnect, onDisconnect }: Readonly<Props>) {
  const { t } = useTranslation();
  const exits = exitsOf(node.data.kind, node.data.config);
  const targets = nodes.filter((candidate) => candidate.id !== node.id && candidate.data.kind !== 'trigger');

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('ai.automation.builder.connections')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        {t('ai.automation.builder.connectionsHint')}
      </Typography>
      <Stack spacing={1.5}>
        {exits.map((exit) => {
          const current = edges.find((edge) => edge.source === node.id && (edge.sourceHandle ?? 'next') === exit)?.target ?? '';
          return (
            <TextField
              key={exit}
              select
              size="small"
              fullWidth
              label={exitLabel(exit, node.data.config, t)}
              value={targets.some((target) => target.id === current) ? current : ''}
              onChange={(event) => {
                if (event.target.value) onConnect(node.id, exit, event.target.value);
                else onDisconnect(node.id, exit);
              }}
              data-testid={`automation-exit-${exit}`}
            >
              <MenuItem value="">
                <em>{t('ai.automation.builder.notConnected')}</em>
              </MenuItem>
              {targets.map((target) => (
                <MenuItem key={target.id} value={target.id}>
                  {t(NODE_KINDS[target.data.kind].labelKey)} — {summaryOf(target.data.kind, target.data.config, t)}
                </MenuItem>
              ))}
            </TextField>
          );
        })}
      </Stack>
    </Box>
  );
}
