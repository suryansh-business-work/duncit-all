import { Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
}

/** One label/value line. Blank values show an em-dash so the row never collapses. */
export default function GrievanceFactRow({ label, value }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={2} justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}
