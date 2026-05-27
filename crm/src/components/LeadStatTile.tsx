import { Card, CardContent, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Pick a theme accent — colour is applied at low opacity for the icon chip. */
  accent?: 'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'error';
}

const ACCENTS: Record<NonNullable<Props['accent']>, string> = {
  primary: '#6366f1',
  info: '#0ea5e9',
  success: '#22c55e',
  warning: '#f59e0b',
  secondary: '#a855f7',
  error: '#ef4444',
};

/**
 * Compact stat card used to surface the headline numbers on a lead's view
 * page (capacity, services count, follow-up etc.). Keeps the look consistent
 * with the dashboard KPI tiles without duplicating that component (which is
 * coupled to dashboard-specific props).
 */
export default function LeadStatTile({ label, value, hint, icon, accent = 'primary' }: Props) {
  const colour = ACCENTS[accent];
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
          {icon && (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1,
                bgcolor: alpha(colour, 0.16),
                color: colour,
                flexShrink: 0,
              }}
            >
              {icon}
            </Stack>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', lineHeight: 1.2 }}
            noWrap
          >
            {label}
          </Typography>
        </Stack>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
