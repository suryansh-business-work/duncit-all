import type { CSSProperties } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { HANDLE_LABEL_KEYS } from '../../node-kinds';
import { classifyLabelOf } from '../../graph-io';
import type { NodeData } from '../../types';

interface Props {
  exits: readonly string[];
  config: NodeData;
  color: string;
}

/** The dot an arrow starts from, sized for a coarse pointer and tinted like the card. */
const handleStyle = (color: string, paper: string): CSSProperties => ({
  width: 12,
  height: 12,
  background: color,
  border: `2px solid ${paper}`,
});

/** A handle's wording — an exit key's copy, or a classify label's own text. */
export function exitLabel(handle: string, config: NodeData, t: (key: string) => string): string {
  const own = classifyLabelOf(config, handle);
  if (own !== null) return own;
  const key = HANDLE_LABEL_KEYS[handle];
  return key ? t(key) : handle;
}

/**
 * The exits down a card's right edge. A single exit is one unlabeled dot at
 * the middle; several are a labeled column, each dot beside its own word, so
 * "Yes" and "No" cannot be mistaken for each other on the canvas.
 */
export default function ExitHandles({ exits, config, color }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dot = handleStyle(color, theme.palette.background.paper);
  if (exits.length === 1) {
    return <Handle type="source" position={Position.Right} id={exits[0]} style={dot} aria-label={exitLabel(exits[0], config, t)} />;
  }
  return (
    <Stack spacing={0.5} sx={{ mt: 1, alignItems: 'flex-end' }}>
      {exits.map((exit) => (
        <Box key={exit} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1, pr: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {exitLabel(exit, config, t)}
          </Typography>
          <Handle
            type="source"
            position={Position.Right}
            id={exit}
            aria-label={exitLabel(exit, config, t)}
            style={{ ...dot, position: 'relative', top: 'auto', right: -14, transform: 'none' }}
          />
        </Box>
      ))}
    </Stack>
  );
}
