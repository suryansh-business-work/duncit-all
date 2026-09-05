import { Box, Stack, Typography } from '@mui/material';

export type Emphasis = 'primary' | 'success' | 'warning' | 'error' | 'default';

interface RowProps {
  label: string;
  value: string;
  emphasis?: Emphasis;
  detail?: string;
}

const COLORS: Record<Emphasis, string> = {
  primary: 'primary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  default: 'text.primary',
};

/** One label/amount line in the results breakdown. */
export function Row({ label, value, emphasis = 'default', detail }: Readonly<RowProps>) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "flex-start",
        justifyContent: "space-between",
        py: 0.75
      }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{
          fontWeight: 600
        }}>{label}</Typography>
        {detail ? (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{detail}</Typography>
        ) : null}
      </Box>
      <Typography
        variant="subtitle1"
        color={COLORS[emphasis]}
        sx={{
          fontWeight: 800,
          ml: 1.5
        }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** The small capitalised heading above each group of rows. */
export function SectionLabel({ text }: Readonly<{ text: string }>) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: "text.secondary",
        fontWeight: 700
      }}>
      {text}
    </Typography>
  );
}
