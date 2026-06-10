import { Chip } from '@mui/material';

const STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  New: 'info',
  Contacted: 'info',
  Qualified: 'info',
  'Follow-up': 'warning',
  Negotiation: 'warning',
  Won: 'success',
  Lost: 'error',
};

const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  Low: 'default',
  Medium: 'info',
  High: 'error',
};

export function StatusChip({ value }: Readonly<{ value: string }>) {
  return <Chip size="small" label={value} color={STATUS_COLOR[value] ?? 'default'} variant="outlined" />;
}

export function PriorityChip({ value }: Readonly<{ value: string }>) {
  return <Chip size="small" label={value} color={PRIORITY_COLOR[value] ?? 'default'} />;
}
