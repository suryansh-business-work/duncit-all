import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface LabelProps {
  /** A small state icon at the left (booked, searching…). */
  icon?: ReactNode;
  /** The muted line above the value — "Price", "You're hosting". */
  caption?: string;
  value: ReactNode;
  /** `price` is the 18/700 figure; `title` a 16/600 state name. */
  emphasis?: 'price' | 'title';
  /** A muted footnote under the value. */
  note?: string | null;
}

/**
 * The left half of the booking bar: what this booking is, or costs.
 * Native twin: the caption + value column of the bars in components/details.
 */
export function BarLabel({ icon, caption, value, emphasis = 'title', note }: Readonly<LabelProps>) {
  const valueSx =
    emphasis === 'price'
      ? { fontSize: 18, fontWeight: 700, lineHeight: 1.2 }
      : { fontSize: 16, fontWeight: 600, lineHeight: 1.2 };
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
      {icon}
      <Box sx={{ minWidth: 0 }}>
        {caption && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>{caption}</Typography>
        )}
        <Typography noWrap sx={valueSx}>
          {value}
        </Typography>
        {note && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>{note}</Typography>
        )}
      </Box>
    </Stack>
  );
}

/** A bar with nothing to press: a state icon and one muted sentence. */
export function BarNotice({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 0, px: 0.5 }}>
      {icon}
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.secondary' }}>{children}</Typography>
    </Stack>
  );
}
