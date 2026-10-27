import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { money } from './money';
import { SEAT_HEIGHT, SEAT_WIDTH } from './layout';
import type { NodeKind, TeamNode } from './types';

export interface SeatData extends Record<string, unknown> {
  node: TeamNode;
  currency: string;
  /** Null on a public view, which cannot edit. */
  onAddChild: ((parentId: string) => void) | null;
}

export const KIND_TONE: Record<NodeKind, 'primary' | 'secondary' | 'success' | 'warning'> = {
  HEAD: 'primary',
  DEPARTMENT: 'secondary',
  ROLE: 'success',
  AI_AGENT: 'warning',
};

/**
 * One seat. Module scope on purpose: React Flow remounts every node when the
 * `nodeTypes` identity changes, so this must never be declared per render.
 */
export default function SeatCard({ data, selected }: NodeProps) {
  const { t } = useTranslation();
  const { node, currency, onAddChild } = data as SeatData;
  const tone = KIND_TONE[node.kind];
  const vacant = node.status === 'VACANT';

  return (
    <Box
      sx={{
        width: SEAT_WIDTH,
        minHeight: SEAT_HEIGHT,
        px: 1.5,
        py: 1,
        bgcolor: 'background.paper',
        border: 2,
        borderStyle: vacant || node.status === 'OPTIONAL' ? 'dashed' : 'solid',
        borderColor: selected ? 'text.primary' : `${tone}.main`,
        boxShadow: selected ? 4 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: `${tone}.main`, fontWeight: 800 }}>
            {t(`hr.teamStructure.kind.${node.kind}`)}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {onAddChild && (
            <DuncitIconButton
              size="small"
              className="nodrag"
              aria-label={t('hr.teamStructure.addUnder', { vars: { title: node.title } })}
              onClick={(event) => {
                event.stopPropagation();
                onAddChild(node.id);
              }}
            >
              <AddIcon fontSize="small" />
            </DuncitIconButton>
          )}
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
          {node.title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          {vacant ? t('hr.teamStructure.status.VACANT') : (node.person_name ?? t(`hr.teamStructure.employment.${node.employment_type}`))}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Chip size="small" label={t(`hr.teamStructure.employment.${node.employment_type}`)} />
          {node.kras && node.kras.length > 0 && (
            <Chip size="small" variant="outlined" label={t('hr.teamStructure.kra.badge', { vars: { count: node.kras.length } })} />
          )}
          {node.monthly_cost != null && (
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {t('hr.teamStructure.perMonth', { vars: { amount: money(node.monthly_cost, currency) } })}
            </Typography>
          )}
        </Stack>
      </Stack>
      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
}
