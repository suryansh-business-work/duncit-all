import { ButtonBase } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  onClick: () => void;
}

/** Gradient "AI Monitoring" pill on a pod row — same look as the create-pod AI
 * chip, so it reads as the one AI affordance across the product. Opens the
 * pod's AI-monitored activity dialog. A real <button>, so DuncitTable's
 * row-click handler ignores it. */
export default function AiMonitorPill({ onClick }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        borderRadius: 999,
        px: 1.25,
        py: 0.5,
        gap: 0.5,
        color: '#fff',
        fontWeight: 700,
        fontSize: 11,
        lineHeight: 1,
        background: 'linear-gradient(120deg, #7C3AED, #EC4899, #F59E0B)',
        boxShadow: 1,
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: 14 }} />
      {t('shell.podMonitoring.aiMonitoring')}
    </ButtonBase>
  );
}
