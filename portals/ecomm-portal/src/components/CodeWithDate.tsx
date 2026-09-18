import { Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';

/** A record's number over the moment it was made — the first cell of the order and return tables. */
export default function CodeWithDate({ code, at }: Readonly<{ code: string; at: string }>) {
  const { formatDateTime } = useDateFormat();
  return (
    <Stack component="span" sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
        {code}
      </Typography>
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {formatDateTime(at)}
      </Typography>
    </Stack>
  );
}
