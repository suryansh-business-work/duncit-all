import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';

export interface Fact {
  label: string;
  /** Empty, null or undefined reads as an em-dash. */
  value?: ReactNode;
  /** An address, an id or a user agent: read letter for letter, so set in the code font. */
  mono?: boolean;
  /** Takes the whole row instead of half of it — roles, a user agent, a reason. */
  wide?: boolean;
  testId?: string;
}

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } } as const;
const WIDE = { gridColumn: '1 / -1' } as const;

/** Labelled read-only values in two columns — what every section of the detail drawer and the decision dialog is made of. */
export default function Facts({ items }: Readonly<{ items: readonly Fact[] }>) {
  return (
    <Box sx={GRID}>
      {items.map(({ label, value, mono, wide, testId }) => {
        const shown = value || EM_DASH;
        return (
          <InfoRow
            key={label}
            label={label}
            testId={testId}
            sx={wide ? WIDE : undefined}
            value={
              mono ? (
                <Typography component="code" variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {shown}
                </Typography>
              ) : (
                shown
              )
            }
          />
        );
      })}
    </Box>
  );
}
