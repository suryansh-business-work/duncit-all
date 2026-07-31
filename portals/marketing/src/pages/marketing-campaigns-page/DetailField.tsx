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
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} component="div">
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" component="div">
          {hint}
        </Typography>
      )}
    </Box>
  );
}
