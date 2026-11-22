import { Box, Stack, Typography } from '@mui/material';
import type { PromptCount } from '../../detailTypes';

interface Props {
  title: string;
  rows: PromptCount[];
  /** Turns a stored key (`OPEN_IN_PLATFORM`, `mobile`) into its label; unknown keys show as stored. */
  labelOf?: (key: string) => string;
}

/**
 * One ranked breakdown — hits by source, by platform, by device. A single
 * series, so one hue and no legend: the heading names it, and each row prints
 * its label and count as text, which is also the table view for anyone who
 * cannot read the bar.
 */
export function BreakdownList({ title, rows, labelOf }: Readonly<Props>) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => row.count));
  return (
    <Box component="section" aria-label={title}>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {rows.map((row) => {
          const label = labelOf?.(row.key) ?? row.key;
          return (
            <Box component="li" key={row.key}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" noWrap title={label}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                  {row.count}
                </Typography>
              </Stack>
              <Box sx={{ height: (theme) => theme.spacing(0.75), bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    width: `${(row.count / max) * 100}%`,
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
