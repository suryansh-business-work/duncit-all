import Chip from '@mui/material/Chip';
import { useTranslation } from '@duncit/shell';
import { podRequestStatusLabel, podRequestStatusTone, type PodRequestStatus } from '@duncit/utils';

const COLOR = { warning: 'warning', success: 'success', neutral: 'default' } as const;

/** A request's state in the shared words and tone every surface uses. */
export default function PodRequestStatusChip({ status }: Readonly<{ status: PodRequestStatus }>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      variant="outlined"
      color={COLOR[podRequestStatusTone(status)]}
      label={podRequestStatusLabel(status, t)}
    />
  );
}
