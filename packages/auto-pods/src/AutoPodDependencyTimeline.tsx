import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { autoPodTicks, type AutoPodLabels, type AutoPodRole, type AutoPodRow } from '@duncit/utils';

type TimelineRow = Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim' | 'pod_mode'>;

export interface AutoPodDependencyTimelineProps {
  row: TimelineRow;
  labels: AutoPodLabels;
}

/** Who enrolled for a role — the name the card would show. */
function enrolledName(row: TimelineRow, role: AutoPodRole): string {
  if (role === 'venue') return row.venue_claim?.venue_name ?? '';
  if (role === 'host') return row.host_claim?.host_name ?? '';
  return row.club_claim?.club_name ?? '';
}

/**
 * The admin table's Pod Dependency cell: Venue → Host → Club Admin as a
 * timeline, a green dot where that partner has enrolled (with their name) and
 * an amber one where the offer is still waiting. The same `autoPodTicks()`
 * derivation as the card's chips, drawn as a line rather than a row — so a
 * virtual offer, which waits on no venue, is a two-stop line.
 */
export function AutoPodDependencyTimeline({ row, labels }: Readonly<AutoPodDependencyTimelineProps>) {
  const ticks = autoPodTicks(row);
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }} data-testid="auto-pod-dependency">
      {ticks.map((tick, index) => {
        const name = enrolledName(row, tick.role);
        const detail = tick.done ? name || labels.tickDone : labels.tickPending;
        const color = tick.done ? 'success.main' : 'warning.main';
        return (
          <Stack key={tick.role} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {index > 0 && <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
            <Box
              component="span"
              aria-label={`${labels.tick(tick.role)} — ${tick.done ? labels.tickDone : labels.tickPending}`}
              sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }}
            />
            <Box sx={{ lineHeight: 1.1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                {labels.tick(tick.role)}
              </Typography>
              <Typography variant="caption" noWrap title={detail} sx={{ color, display: 'block', maxWidth: 120 }}>
                {detail}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}
