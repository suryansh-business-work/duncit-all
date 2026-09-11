import { Alert, Stack } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { DuncitButton } from '@duncit/buttons';
import { usePodClubAdminHelp, type PodHelpSide } from '../hooks/usePodClubAdminHelp';
import { useTranslation } from '../i18n/useTranslation';

/**
 * "Ask for help" — messages every admin of the pod's club by email and
 * WhatsApp with the pod attached, then says how it went. The button stays for a
 * failed request so it can be retried, and goes once there is nothing left to
 * press. Native twin: AskClubAdminHelp (rule 27).
 */
export default function AskClubAdminHelp({
  podId,
  side,
  label,
}: Readonly<{ podId: string; side: PodHelpSide; label: string }>) {
  const { t } = useTranslation();
  const { ask, loading, outcome } = usePodClubAdminHelp(podId, side);
  const canAsk = !outcome || outcome.severity === 'error';

  return (
    <Stack spacing={1} data-testid="ask-club-admin-help">
      {outcome && (
        <Alert severity={outcome.severity} data-testid="ask-club-admin-help-outcome">
          {t(outcome.key)}
        </Alert>
      )}
      {canAsk && (
        <DuncitButton
          variant="outlined"
          fullWidth
          loading={loading}
          startIcon={<NotificationsActiveIcon />}
          onClick={ask}
          data-testid="ask-club-admin-help-button"
          sx={{ fontWeight: 600 }}
        >
          {loading ? t('mweb.podClubAdmin.askHelpSending') : label}
        </DuncitButton>
      )}
    </Stack>
  );
}
