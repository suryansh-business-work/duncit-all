import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Paper, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import { useTranslation } from '@duncit/shell';
import { NODE_KINDS } from '../../node-kinds';
import { exitsOf, type CanvasNode } from '../../graph-io';
import ExitHandles from './ExitHandles';
import { summaryOf } from './node-summary';
import { toneColor } from './tone';

export const NODE_WIDTH = 260;

/**
 * One step on the canvas.
 *
 * Module-scope and memoised: React Flow keeps `nodeTypes` in a ref and remounts
 * every node when the component's identity changes, so a card defined inside
 * the canvas would rebuild the whole graph on each keystroke in the inspector.
 *
 * The card carries the step's colour on its left edge, its kind and a one-line
 * summary of its settings, and — when the last save said something is wrong
 * with it — a red mark whose tooltip says what.
 */
function StepNode({ data, selected }: NodeProps<CanvasNode>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const meta = NODE_KINDS[data.kind];
  const Icon = meta.icon;
  const color = toneColor(theme, meta.tone);
  const exits = exitsOf(data.kind, data.config);
  const summary = summaryOf(data.kind, data.config, t);
  const hasIssues = data.issues.length > 0;

  let borderColor = theme.palette.divider;
  if (hasIssues) borderColor = theme.palette.error.main;
  if (selected) borderColor = theme.palette.primary.main;

  return (
    <Paper
      elevation={selected ? 6 : 1}
      sx={{
        width: NODE_WIDTH,
        borderRadius: 2,
        border: '1.5px solid',
        borderColor,
        borderLeft: `6px solid ${color}`,
        bgcolor: 'background.paper',
        px: 1.5,
        py: 1.25,
        transition: 'box-shadow 120ms ease, border-color 120ms ease',
      }}
      data-testid={`automation-node-${data.kind}`}
    >
      {data.kind !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ width: 12, height: 12, background: theme.palette.text.secondary, border: `2px solid ${theme.palette.background.paper}` }}
          aria-label={t('ai.automation.handles.next')}
        />
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ color, display: 'flex', mt: 0.25 }}>
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {t(meta.labelKey)}
          </Typography>
          <Typography variant="caption" noWrap title={summary} sx={{ color: 'text.secondary', display: 'block' }}>
            {summary}
          </Typography>
        </Box>
        {hasIssues && (
          <Tooltip title={data.issues.join(' · ')}>
            <ErrorOutlinedIcon color="error" fontSize="small" aria-label={data.issues.join('. ')} />
          </Tooltip>
        )}
      </Stack>
      <ExitHandles exits={exits} config={data.config} color={color} />
    </Paper>
  );
}

export default memo(StepNode);
