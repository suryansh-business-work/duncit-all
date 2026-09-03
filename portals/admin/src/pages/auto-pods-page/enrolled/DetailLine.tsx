import { Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
}

/** One "label — value" row. An empty value draws nothing rather than a blank
 * line: a partner's phone or address is often simply not on file. */
export default function DetailLine({ label, value }: Readonly<Props>) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1.5}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 96, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
