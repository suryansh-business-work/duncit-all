import { ButtonBase } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AI_MONITOR_GRADIENT_CSS } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  onClick: () => void;
}

/** Colourful gradient pill beside every step's eyebrow. Opens the "What AI
 * monitors" guidelines dialog. */
export default function AiMonitorChip({ onClick }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={t('mweb.createPod.aiMonitors')}
      data-testid="create-pod-ai-chip"
      sx={{
        borderRadius: 999,
        px: 1.25,
        py: 0.5,
        gap: 0.5,
        color: '#fff',
        fontWeight: 700,
        fontSize: 11,
        lineHeight: 1,
        background: AI_MONITOR_GRADIENT_CSS,
        boxShadow: 1,
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: 14 }} />
      {t('mweb.createPod.aiMonitoring')}
    </ButtonBase>
  );
}
