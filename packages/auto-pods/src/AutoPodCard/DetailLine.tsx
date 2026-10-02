import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * One icon + text line: the pinned city, the venue, the slot.
 *
 * The text WRAPS rather than truncating. A card's city line is a full sentence
 * while nobody has enrolled — "Any city — the first partner to enrol sets it"
 * — and clipping it to one line hid the half that says what happens next.
 */
export function DetailLine({ icon, text }: Readonly<{ icon: ReactNode; text: string }>) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ display: 'flex', pt: '2px' }}>{icon}</Box>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}
