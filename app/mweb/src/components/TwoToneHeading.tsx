import type { ElementType } from 'react';
import { Box, Typography, type TypographyProps } from '@mui/material';

interface Props {
  /** The ink half — what the heading says. */
  lead: string;
  /** The muted half — the softer second beat, same size. */
  trail?: string | null;
  /** Put the muted half on its own line (greetings, heroes); inline otherwise. */
  stacked?: boolean;
  variant?: TypographyProps['variant'];
  align?: TypographyProps['align'];
  component?: ElementType;
}

/**
 * The two-tone heading of the calm design: one size, one weight, the second
 * beat in the muted ink. Replaces coloured "accent word" headings so a title
 * reads as a single calm statement. Native twin: components/TwoToneHeading.
 */
export default function TwoToneHeading({
  lead,
  trail,
  stacked = false,
  variant = 'h5',
  align,
  component = 'h1',
}: Readonly<Props>) {
  const separator = stacked ? null : ' ';
  return (
    <Typography variant={variant} align={align} component={component} sx={{ lineHeight: 1.2 }}>
      {lead}
      {trail ? (
        <Box component="span" sx={{ color: 'text.secondary', display: stacked ? 'block' : 'inline' }}>
          {separator}
          {trail}
        </Box>
      ) : null}
    </Typography>
  );
}
