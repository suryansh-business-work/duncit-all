import { Chip } from '@mui/material';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { DeletionRequestRow } from './deletion.queries';

/** Where an open deletion request stands, on the brand or product row it hides. */
export default function DeletionStateChip({ request }: Readonly<{ request: DeletionRequestRow }>) {
  const { t } = useTranslation();
  if (request.status === 'PENDING') {
    return <Chip size="small" color="warning" variant="outlined" label={t('partners.deletionRequest.chipPending')} data-testid="deletion-chip" />;
  }
  if (request.blocked_reason) {
    return (
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        label={t('partners.deletionRequest.chipWaiting', { vars: { reason: request.blocked_reason } })}
        data-testid="deletion-chip"
      />
    );
  }
  return (
    <Chip
      size="small"
      color="error"
      variant="outlined"
      label={t('partners.deletionRequest.chipScheduled', { vars: { date: formatDate(request.scheduled_for) } })}
      data-testid="deletion-chip"
    />
  );
}
