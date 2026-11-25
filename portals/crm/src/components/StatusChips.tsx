import { StatusChip as UiStatusChip, type StatusColorMap } from '@duncit/ui';
import { CRM_LEAD_PRIORITY_TONE, CRM_LEAD_STATUS_TONE } from '@duncit/utils';

/* The tones are shared with the Duncit CRM app (@duncit/utils crm-lead-detail). */
const STATUS_COLOR: StatusColorMap = { ...CRM_LEAD_STATUS_TONE };

const PRIORITY_COLOR: StatusColorMap = { ...CRM_LEAD_PRIORITY_TONE };

export function StatusChip({ value }: Readonly<{ value: string }>) {
  return <UiStatusChip status={value} colorMap={STATUS_COLOR} variant="outlined" />;
}

export function PriorityChip({ value }: Readonly<{ value: string }>) {
  return <UiStatusChip status={value} colorMap={PRIORITY_COLOR} />;
}
