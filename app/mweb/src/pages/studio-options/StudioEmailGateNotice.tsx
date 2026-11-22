import { useNavigate } from 'react-router';
import { Alert, AlertTitle, Box, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { STUDIO_EMAIL_GATE_KEYS } from '@duncit/utils';
import { VERIFY_EMAIL_PATH } from '../../hooks/useStudioEmailGate';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * What the Host, Venue and Club Admin Studio pages show in place of their
 * options while the account's email is unverified, so a deep link or a
 * remembered role cannot get round the gate. Native twin:
 * components/studio-options/StudioEmailGateNotice.
 */
export default function StudioEmailGateNotice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Box sx={{ px: 2 }}>
      <Alert data-testid="studio-email-gate" severity="warning" sx={{ borderRadius: '16px' }}>
        <AlertTitle sx={{ fontWeight: 700 }}>{t(STUDIO_EMAIL_GATE_KEYS.title)}</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {t(STUDIO_EMAIL_GATE_KEYS.body)}
        </Typography>
        <DuncitButton
          data-testid="studio-email-gate-action"
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => navigate(VERIFY_EMAIL_PATH)}
        >
          {t(STUDIO_EMAIL_GATE_KEYS.action)}
        </DuncitButton>
      </Alert>
    </Box>
  );
}
