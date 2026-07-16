import type { ReactNode } from 'react';
import { StatCard } from '@duncit/ui';

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
export default function LeadStatTile({ label, value, hint, icon, accent = 'primary' }: Readonly<Props>) {
  const colour = ACCENTS[accent];
  return (
    <StatCard
      layout="default"
      iconPlacement="start"
      icon={icon}
      iconBox={icon ? { color: colour, size: 30, radius: 1 } : undefined}
      label={label}
      labelVariant="caption"
      labelWeight={700}
      labelSx={{
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      value={value}
      valueVariant="h6"
      valueNoWrap
      valueSx={{ lineHeight: 1.2 }}
      hint={hint}
      hintSx={{ whiteSpace: 'nowrap' }}
      cardVariant="elevation"
      headerSx={{ mb: 0.5, gap: 1.25 }}
      sx={{ flex: 1, minWidth: 0 }}
      contentSx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}
    />
  );
}
