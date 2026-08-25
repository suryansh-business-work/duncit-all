import { Box, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
  hint?: string;
}

/** One labelled fact in a details dialog. */
export default function DetailField({ label, value, hint }: Readonly<Props>) {
  return (
    <Box>
      <Typography variant="caption" component="div" sx={{
        color: "text.secondary"
      }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 600
      }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
