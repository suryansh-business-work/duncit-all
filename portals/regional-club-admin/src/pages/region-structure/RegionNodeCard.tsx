import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n';
import { NODE_HEIGHT, NODE_WIDTH, type LayoutDirection } from './layout';
import { NODE_KIND_KEYS, NODE_TONE, type RegionNodeKind } from '../queries';

export interface RegionNodeData extends Record<string, unknown> {
  kind: RegionNodeKind;
  label: string;
  sub_label: string;
  count: number;
  /** HOST and CLUB_ADMIN boxes open the drill-down; the rest are read-only. */
  openable: boolean;
  /** False while a search is running and this box is not one of the matches. */
  matched: boolean;
  direction: LayoutDirection;
}

/**
 * One box on the region canvas.
 *
 * Hoisted to module scope rather than declared inside the canvas (rule 26a):
 * React Flow keeps `nodeTypes` in a ref and remounts every node when the map's
 * identity changes, so a component defined per render would rebuild the whole
 * graph on each keystroke of the search box.
 *
 * A box that DOES something when clicked says so — the cursor is a pointer and
 * its count chip is coloured. Nothing else pretends to be interactive. While a
 * search is running the boxes that do not match dim rather than disappear:
 * a tree with holes punched in it is unreadable, and the branch a match sits on
 * is most of what the manager is looking for.
 */
export default function RegionNodeCard({ data }: NodeProps) {
  const { t } = useTranslation();
  const node = data as RegionNodeData;
  const tone = NODE_TONE[node.kind];
  const vertical = node.direction === 'TB';

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
        boxShadow: node.matched ? 3 : 1,
        opacity: node.matched ? 1 : 0.28,
        transition: 'opacity 160ms ease, box-shadow 160ms ease',
      }}
    >
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        style={{ opacity: 0 }}
      />
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
      <Handle
        type="source"
        position={vertical ? Position.Bottom : Position.Right}
        style={{ opacity: 0 }}
      />
    </Box>
  );
}
