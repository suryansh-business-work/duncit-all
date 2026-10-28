import type { ReactNode } from 'react';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';

/** Window options for the month-by-month charts. The server clamps to 1..36. */
export const MONTH_RANGES = [6, 12, 24, 36];

interface Props {
  icon: ReactNode;
  title: string;
  /** One paragraph under the title saying what the numbers mean. */
  subtitle?: ReactNode;
  months: number;
  onMonthsChange: (months: number) => void;
  periodLabel: string;
  /** The option text for a window of `n` months. */
  monthsLabel: (n: number) => string;
  /** Shown as an error banner when the stats could not be read. */
  errorText?: string | null;
  /** Extra banners under the header (a ledger drift warning). */
  children?: ReactNode;
}

/** The head of every Loyalty dashboard: what it is, the period it covers, and anything wrong with it. */
export default function DashboardHeader({
  icon,
  title,
  subtitle,
  months,
  onMonthsChange,
  periodLabel,
  monthsLabel,
  errorText,
  children,
}: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {icon}
            <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
          </Stack>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <TextField
          select
          size="small"
          label={periodLabel}
          value={months}
          onChange={(e) => onMonthsChange(Number(e.target.value))}
          sx={{ minWidth: 180 }}
        >
          {MONTH_RANGES.map((option) => (
            <MenuItem key={option} value={option}>
              {monthsLabel(option)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {errorText && <Alert severity="error">{errorText}</Alert>}
      {children}
    </Stack>
  );
}
