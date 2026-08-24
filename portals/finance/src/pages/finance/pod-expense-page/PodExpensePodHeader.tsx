import { Chip, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StatusChip } from '@duncit/ui';
import { formatDate, useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import { POD_STATUS_COLORS, usePodStatusLabels } from './pod-status';
import type { PodExpensePodRow } from './queries';

interface Props {
  pod: PodExpensePodRow;
  currency: string;
  onClose: () => void;
}

/** The drawer's title block: which pod this spend belongs to, and its running total. */
export default function PodExpensePodHeader({ pod, currency, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const statusLabels = usePodStatusLabels();
  const spent = formatMoney(pod.expense_total, { symbol: currency, decimals: 2, grouping: false });
  const billsLabel = t('finance.podExpense.billsOfEntries', {
    vars: { bills: pod.bill_count, count: pod.expense_count },
  });

  return (
    <Stack spacing={1.25} sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} noWrap>
            {pod.pod_title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pod.pod_code} · {formatDate(pod.pod_date_time)}
          </Typography>
        </Stack>
        <IconButton aria-label={t('shell.common.close')} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <StatusChip
          status={pod.pod_status}
          colorMap={POD_STATUS_COLORS}
          label={statusLabels[pod.pod_status]}
        />
        <Chip size="small" color="primary" label={`${t('finance.podExpense.spent')} ${spent}`} />
        <Chip
          size="small"
          variant="outlined"
          color={pod.bill_count < pod.expense_count ? 'warning' : 'default'}
          label={billsLabel}
        />
      </Stack>
    </Stack>
  );
}
