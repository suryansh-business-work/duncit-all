import { Stack, Typography } from '@mui/material';

/** A summary row: label muted, value ink; the total row is 700 and ink. */
export default function Row({
  label,
  value,
  bold,
  testId,
}: Readonly<{ label: string; value: string; bold?: boolean; testId?: string }>) {
  const size = bold ? '1rem' : '0.875rem';
  return (
    <Stack
      data-testid={testId}
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: 'center' }}
    >
      <Typography sx={{ fontSize: size, fontWeight: bold ? 700 : 500, color: bold ? 'text.primary' : 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: size, fontWeight: bold ? 700 : 600, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}
