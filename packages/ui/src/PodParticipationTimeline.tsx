import type { ReactElement } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import UndoIcon from '@mui/icons-material/Undo';
import {
  buildPodParticipationTimeline,
  timelineCopy,
  type PodParticipationInput,
  type PodTimelineNode,
  type TimelineCopy,
} from '@duncit/utils';

const TONE_ICON: Record<TimelineCopy['tone'], ReactElement> = {
  good: <CheckCircleIcon color="success" fontSize="small" />,
  bad: <CancelIcon color="error" fontSize="small" />,
  warn: <UndoIcon color="warning" fontSize="small" />,
  info: <HourglassTopIcon color="info" fontSize="small" />,
};

interface NodeProps {
  node: PodTimelineNode;
  depth: number;
  formatDateTime: (value: string) => string;
  /** DUN-BKO id to mark as the request the current screen is about. */
  highlightBackoutNo?: string;
}

/**
 * One node and everything under it.
 *
 * Hoisted and recursive because the workflow branches: a backout leads to the
 * spot being filled or not, and each of those leads somewhere else again. A
 * flat list can show the same events but not which followed from which, and
 * "why was I not refunded" is a question only the shape answers.
 */
function TimelineNode({ node, depth, formatDateTime, highlightBackoutNo }: Readonly<NodeProps>) {
  const copy = timelineCopy(node);
  const children = node.children ?? [];
  const isThisRequest = !!highlightBackoutNo && node.backoutNo === highlightBackoutNo;

  return (
    <Box sx={{ position: 'relative', pl: depth === 0 ? 0 : 2.5 }}>
      {/* The elbow into a nested branch — what makes "this followed from that"
          visible without a second column. */}
      {depth > 0 && (
        <Box
          sx={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: '2px', bgcolor: 'divider' }}
        />
      )}
      <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ py: 0.6 }}>
        <Box sx={{ mt: 0.25, lineHeight: 0 }}>{TONE_ICON[copy.tone]}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {copy.title}
            </Typography>
            {node.state === 'current' && (
              <Chip
                size="small"
                variant="outlined"
                color="info"
                label="In progress"
                sx={{ height: 20, fontSize: 11 }}
              />
            )}
            {/* The id is the whole point of the mapping: this line and the row on
                Finance's User Backout Refunds page are the same request. */}
            {node.backoutNo && node.kind === 'BACKOUT_REQUESTED' && (
              <Chip
                size="small"
                variant={isThisRequest ? 'filled' : 'outlined'}
                color={isThisRequest ? 'primary' : 'default'}
                label={node.backoutNo}
                sx={{ height: 20, fontSize: 11, fontFamily: 'monospace' }}
              />
            )}
          </Stack>
          {node.at && (
            <Typography variant="caption" color="text.secondary" display="block">
              {formatDateTime(node.at)}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {copy.detail}
          </Typography>
        </Box>
      </Stack>
      {children.map((child, index) => (
        <TimelineNode
          key={`${child.kind}-${child.backoutNo ?? index}`}
          node={child}
          depth={depth + 1}
          formatDateTime={formatDateTime}
          highlightBackoutNo={highlightBackoutNo}
        />
      ))}
    </Box>
  );
}

export interface PodParticipationTimelineProps {
  /** The booking, in the shape the shared model reads. */
  input: PodParticipationInput;
  formatDateTime: (value: string) => string;
  /** Marks one branch as the request this screen is about (Finance detail). */
  highlightBackoutNo?: string;
}

/**
 * What happened to one booking.
 *
 * The nodes and the words both come from @duncit/utils, so mWeb's Pod History,
 * Finance's Backout Refunds and Admin's pod details draw the same story from
 * the same rows. Three hand-written accounts of one workflow is how a support
 * conversation ends up with two people reading different screens and
 * disagreeing about what the system did.
 */
export function PodParticipationTimeline({
  input,
  formatDateTime,
  highlightBackoutNo,
}: Readonly<PodParticipationTimelineProps>) {
  const nodes = buildPodParticipationTimeline(input);

  return (
    <Stack spacing={0.25}>
      {nodes.map((node, index) => (
        <TimelineNode
          key={`${node.kind}-${node.backoutNo ?? index}`}
          node={node}
          depth={0}
          formatDateTime={formatDateTime}
          highlightBackoutNo={highlightBackoutNo}
        />
      ))}
    </Stack>
  );
}
