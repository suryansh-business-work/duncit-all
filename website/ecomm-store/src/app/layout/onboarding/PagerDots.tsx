import { Box, Stack } from '@mui/material';

import { STORE_TOKENS as T } from '../../../theme/tokens';

interface PagerDotsProps {
  count: number;
  active: number;
  /** "Page 2 of 3" — the dots themselves are decoration. */
  label: string;
}

const DOT_KEYS = ['first', 'second', 'third', 'fourth', 'fifth'] as const;

/** The pager: a long dark bar for the current page, small dots for the rest. */
export function PagerDots({ count, active, label }: Readonly<PagerDotsProps>) {
  return (
    <Stack direction="row" spacing={0.75} role="img" aria-label={label}>
      {DOT_KEYS.slice(0, count).map((key, index) => (
        <Box
          key={key}
          sx={{
            height: 8,
            width: index === active ? 28 : 8,
            borderRadius: T.radius.pill,
            bgcolor: index === active ? T.navBar : T.border,
            transition: 'width 200ms ease',
          }}
        />
      ))}
    </Stack>
  );
}
