import { Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  value?: string | null;
}

/** One `label — value` row in the detail rail. Renders nothing when the
 * catalogue has no value, so an empty SKU leaves no dangling label. */
export default function InfoLine({ label, value }: Readonly<Props>) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" sx={{ textAlign: 'right' }}>
        {text}
      </Typography>
    </Stack>
  );
}
