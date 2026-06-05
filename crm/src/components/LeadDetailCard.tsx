import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

interface SimpleProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Optional control rendered at the right of the header (e.g. an Add button). */
  action?: ReactNode;
  children: ReactNode;
}

export function LeadDetailCard({ title, subtitle, icon, action, children }: SimpleProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
          {icon}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

interface RowProps {
  label: string;
  value?: ReactNode;
}

export function LeadDetailRow({ label, value }: RowProps) {
  const display = value === '' || value === null || value === undefined ? '—' : value;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ py: 0.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ width: { sm: 170 }, flexShrink: 0, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {typeof display === 'string' || typeof display === 'number' ? (
          <Typography variant="body2">{String(display)}</Typography>
        ) : (
          display
        )}
      </Box>
    </Stack>
  );
}
