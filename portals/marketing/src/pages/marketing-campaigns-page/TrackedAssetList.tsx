import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface AssetRow {
  url: string;
  count: number;
  badge?: ReactNode;
}

interface Props {
  title: string;
  emptyText: string;
  rows: AssetRow[];
  countLabel: string;
}

/** The tracked links or images of one campaign, each with how often it was
 * followed or fetched. Keyed on the URL, which is unique per campaign — the
 * instrumenter gives a repeated destination a single entry. */
export default function TrackedAssetList({
  title,
  emptyText,
  rows,
  countLabel,
}: Readonly<Props>) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      )}
      <Stack spacing={1}>
        {rows.map((row) => (
          <Stack
            key={row.url}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ minWidth: 0 }}
          >
            {row.badge}
            <Typography
              variant="body2"
              sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}
            >
              {row.url}
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
              {`${row.count} ${countLabel}`}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
