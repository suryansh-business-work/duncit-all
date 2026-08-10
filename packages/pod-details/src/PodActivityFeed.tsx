import { Box, Chip, Stack, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { PodAuditEntry } from './queries';
import { fmtDateTime } from './format';

/** Width of the rail gutter. Every line of every entry starts after it. */
const RAIL = 22;

interface Props {
  entries: PodAuditEntry[];
  colorMap: StatusColorMap;
}

/**
 * The pod's audit trail, on a rail.
 *
 * The names used to start wherever the action chip happened to end — after
 * "CREATE" in one row and after "VENUE_APPROVED" in the next — so the column
 * read as ragged noise. The name leads now and the chips trail it, which puts
 * every actor, note and timestamp on one left edge; the rail's dot carries the
 * colour the chip used to carry on its own.
 */
export default function PodActivityFeed({ entries, colorMap }: Readonly<Props>) {
  return (
    <Stack sx={{ maxHeight: 340, overflowY: 'auto', pr: 1 }}>
      {entries.map((entry, index) => {
        const tone = colorMap[entry.action] ?? 'primary';
        const last = index === entries.length - 1;
        return (
          <Stack key={entry.id} direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box sx={{ width: RAIL, flexShrink: 0, position: 'relative' }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  mt: 0.75,
                  mx: 'auto',
                  borderRadius: '50%',
                  bgcolor: tone === 'default' ? 'text.disabled' : `${tone}.main`,
                }}
              />
              {/* No tail under the final dot — a line into empty space reads as
                  a missing entry. */}
              {!last && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 20,
                    bottom: 0,
                    left: '50%',
                    width: 2,
                    ml: '-1px',
                    bgcolor: 'divider',
                  }}
                />
              )}
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0, pb: last ? 0 : 2.5 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" fontWeight={700}>
                  {entry.actor_name || entry.source}
                </Typography>
                <StatusChip status={entry.action} colorMap={colorMap} />
                <Chip label={entry.source} size="small" variant="outlined" />
              </Stack>
              {entry.note && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {entry.note}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {fmtDateTime(entry.created_at)}
              </Typography>
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
