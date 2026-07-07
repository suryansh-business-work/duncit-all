import { ButtonBase } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface Props {
  onClick: () => void;
}

/** Colourful gradient pill beside every step's eyebrow. Opens the "What AI
 * monitors" guidelines dialog. */
export default function AiMonitorChip({ onClick }: Readonly<Props>) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="What AI monitors"
      data-testid="create-pod-ai-chip"
      sx={{
        borderRadius: 999,
        px: 1.25,
        py: 0.5,
        gap: 0.5,
        color: '#fff',
        fontWeight: 900,
        fontSize: 11,
        lineHeight: 1,
        background: 'linear-gradient(120deg, #7C3AED, #EC4899, #F59E0B)',
        boxShadow: 1,
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: 14 }} />
      AI monitoring
    </ButtonBase>
  );
}
