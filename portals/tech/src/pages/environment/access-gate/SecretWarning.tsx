import { Alert, AlertTitle } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useTranslation } from '@duncit/app-settings';

/** "Confidential — do not share", shown on the gate and above the keys themselves. */
export default function SecretWarning() {
  const { t } = useTranslation();
  return (
    <Alert
      severity="error"
      variant="outlined"
      icon={<ReportProblemIcon />}
      role="note"
      data-testid="env-secret-warning"
    >
      <AlertTitle sx={{ fontWeight: 800 }}>{t('tech.environment.secretWarningTitle')}</AlertTitle>
      {t('tech.environment.secretWarningBody')}
    </Alert>
  );
}
