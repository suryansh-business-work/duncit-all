import { StatusChip as UiStatusChip, type StatusColorMap } from '@duncit/ui';

const STATUS_COLOR: StatusColorMap = {
  New: 'info',
  Contacted: 'info',
  Qualified: 'info',
  'Follow-up': 'warning',
  Negotiation: 'warning',
  Won: 'success',
  Lost: 'error',
};

const PRIORITY_COLOR: StatusColorMap = {
  Low: 'default',
  Medium: 'info',
  High: 'error',
};

export function StatusChip({ value }: Readonly<{ value: string }>) {
  return <UiStatusChip status={value} colorMap={STATUS_COLOR} variant="outlined" />;
}

export function PriorityChip({ value }: Readonly<{ value: string }>) {
  return <UiStatusChip status={value} colorMap={PRIORITY_COLOR} />;
}
