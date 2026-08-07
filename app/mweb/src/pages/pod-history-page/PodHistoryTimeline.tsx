import { Box, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import UndoIcon from '@mui/icons-material/Undo';
import {
  buildPodParticipationTimeline,
  timelineCopy,
  type PodTimelineNode,
  type TimelineCopy,
} from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import type { PodHistoryItem } from './queries';

const TONE_ICON: Record<TimelineCopy['tone'], React.ReactElement> = {
  good: <CheckCircleIcon color="success" fontSize="small" />,
  bad: <CancelIcon color="error" fontSize="small" />,
  warn: <UndoIcon color="warning" fontSize="small" />,
  info: <HourglassTopIcon color="info" fontSize="small" />,
};

/**
 * One node and everything under it.
 *
 * Hoisted and recursive because the workflow branches: a backout leads to a
 * spot being filled or not, and each of those leads somewhere else again. A
 * flat list can show the same events but not which followed from which, and
 * "why was I not refunded" is a question only the shape answers.
 */
function TimelineNode({
  node,
  depth,
  formatDateTime,
}: Readonly<{
  node: PodTimelineNode;
  depth: number;
  formatDateTime: (value: string) => string;
}>) {
  const copy = timelineCopy(node);
  const children = node.children ?? [];

  return (
    <Box sx={{ position: 'relative', pl: depth === 0 ? 0 : 2.5 }}>
      {/* The elbow into a nested branch — what makes "this followed from that"
          visible without a second column. */}
      {depth > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: 6,
            top: 0,
            bottom: 0,
            width: '2px',
            bgcolor: 'divider',
          }}
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
              <Chip size="small" variant="outlined" color="info" label="In progress" sx={{ height: 20, fontSize: 11 }} />
            )}
            {/* The id is the whole point of the mapping: this line and the row on
                Finance's User Backout Refunds page are the same request. */}
            {node.backoutNo && node.kind === 'BACKOUT_REQUESTED' && (
              <Chip
                size="small"
                variant="outlined"
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
        />
      ))}
    </Box>
  );
}

/**
 * What happened to this booking.
 *
 * The nodes come from @duncit/utils, so this screen and the native one draw the
 * same story from the same rows — including the parts the old timeline could
 * not express: no refund state at all when nobody asked for one, an attendance
 * state once the pod has happened, and one branch per backout, each carrying
 * the DUN-BKO id Finance works from.
 */
export default function PodHistoryTimeline({ item }: Readonly<{ item: PodHistoryItem }>) {
  const { formatDateTime } = useDateFormat();
  const nodes = buildPodParticipationTimeline({
    joinedAt: item.joined_at,
    podDateTime: item.pod?.pod_date_time,
    attended: item.attended ?? false,
    attendedAt: item.attended_at,
    cancelledBy: item.pod_cancelled_by ?? null,
    cancelledAt: item.pod_cancelled_at,
    backouts: item.backouts ?? [],
  });

  return (
    <Stack spacing={0.25}>
      {nodes.map((node, index) => (
        <TimelineNode
          key={`${node.kind}-${node.backoutNo ?? index}`}
          node={node}
          depth={0}
          formatDateTime={formatDateTime}
        />
      ))}
    </Stack>
  );
}
