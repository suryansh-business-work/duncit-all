import { Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from '../../i18n/useTranslation';

/** Top banner of the waiting page — big yellow tick, heading + subheading,
 * top-center aligned. Native twin (rule 27). */
export default function PendingBanner() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.25} alignItems="center" sx={{ py: 2 }} data-testid="pod-pending-banner">
      <CheckCircleIcon sx={{ fontSize: 64, color: 'warning.main' }} />
      <Typography variant="h6" fontWeight={700} textAlign="center">
        {t('mweb.podPending.bannerTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {t('mweb.podPending.bannerBody')}
      </Typography>
    </Stack>
  );
}
