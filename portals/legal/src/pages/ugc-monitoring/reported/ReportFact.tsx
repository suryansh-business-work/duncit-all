import { Box, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
}

/** One labelled, read-only line of a report — the reason, the reporter's words. */
export default function ReportFact({ label, value }: Readonly<Props>) {
  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Box>
  );
}
