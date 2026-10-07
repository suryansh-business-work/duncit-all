import { Chip } from '@mui/material';
import { podRequestStatusLabel, podRequestStatusTone, type PodRequestStatus } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

const CHIP_COLOR = { warning: 'warning', success: 'success', neutral: 'default' } as const;

interface Props {
  status: PodRequestStatus;
  testId?: string;
}

/** A Pod Request's status in words and tone — the shared helpers, so every surface agrees. */
export default function PodRequestStatusChip({ status, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      color={CHIP_COLOR[podRequestStatusTone(status)]}
      label={podRequestStatusLabel(status, t)}
      data-testid={testId}
    />
  );
}
