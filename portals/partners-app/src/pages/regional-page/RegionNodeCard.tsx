import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { NODE_HEIGHT, NODE_WIDTH } from './layout';
import { NODE_KIND_KEYS, NODE_TONE, type RegionNodeKind } from './queries';

export interface RegionNodeData extends Record<string, unknown> {
  kind: RegionNodeKind;
  label: string;
  sub_label: string;
  count: number;
  /** HOST nodes open the pods drawer; every other level is read-only. */
  openable: boolean;
}

/**
 * One box on the region canvas.
 *
 * Hoisted to module scope rather than declared inside the canvas (rule 26a):
 * React Flow keeps `nodeTypes` in a ref and remounts every node when the map's
 * identity changes, so a component defined per render would rebuild the whole
 * graph on each keystroke elsewhere on the page.
 *
 * A HOST box is the only one that does anything when clicked, and it says so —
 * the pod count is a chip and the cursor is a pointer. Nothing else pretends
 * to be interactive.
 */
export default function RegionNodeCard({ data }: NodeProps) {
  const { t } = useTranslation();
  const node = data as RegionNodeData;
  const tone = NODE_TONE[node.kind];

  return (
    <Box
      sx={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 2,
        borderColor: `${tone}.main`,
        cursor: node.openable ? 'pointer' : 'default',
        boxShadow: 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{ color: `${tone}.main`, fontWeight: 800, letterSpacing: 0.4 }}
          >
            {t(NODE_KIND_KEYS[node.kind])}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {node.count > 0 && (
            <Chip size="small" color={node.openable ? 'success' : 'default'} label={node.count} />
          )}
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
          {node.label}
        </Typography>
        {node.sub_label && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
            {node.sub_label}
          </Typography>
        )}
      </Stack>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </Box>
  );
}
