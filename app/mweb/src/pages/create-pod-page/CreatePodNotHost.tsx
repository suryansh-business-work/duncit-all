import { useNavigate } from 'react-router';
import { Alert } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/** Create Pod for someone who is not a host yet: what is missing, and the way to become one. */
export default function CreatePodNotHost() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Alert
      data-testid="create-pod-not-host"
      severity="info"
      action={
        <DuncitButton data-testid="create-pod-become-host" color="inherit" size="small" onClick={() => navigate('/become-host')}>
          {t('mweb.createPod.becomeHost')}
        </DuncitButton>
      }
    >
      {t('mweb.createPod.hostRequired')}
    </Alert>
  );
}
