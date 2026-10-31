import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { STATUS_COLORS, STATUS_LABEL } from './copy';
import type { MarketingRunStatus } from './queries';

/** A run's status as a coloured chip — the same colour in the table, the legend and the drawer. */
export default function RunStatusChip({ status }: Readonly<{ status: MarketingRunStatus }>) {
  const { t } = useTranslation();
  return <StatusChip status={status} colorMap={STATUS_COLORS} label={t(STATUS_LABEL[status])} />;
}
