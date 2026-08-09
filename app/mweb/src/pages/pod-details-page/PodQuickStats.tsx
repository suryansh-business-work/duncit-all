import { Chip, Stack } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  spotsTaken: number;
  spotsTotal: number;
}

/** What is left of the pod, at a glance. The view counter was removed: a
 * number nobody can act on, next to the one that decides whether to book. */
export default function PodQuickStats({ spotsTaken, spotsTotal }: Readonly<Props>) {
  const { t } = useTranslation();
  const remaining = spotsTotal > 0 ? Math.max(spotsTotal - spotsTaken, 0) : null;
  if (remaining === null) return null;

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
      <Chip
        variant="outlined"
        color={remaining <= 3 ? 'warning' : 'default'}
        icon={<ConfirmationNumberIcon fontSize="small" />}
        label={t('mweb.podDetails.spotsLeftCount', { vars: { count: remaining } })}
        size="small"
      />
    </Stack>
  );
}
