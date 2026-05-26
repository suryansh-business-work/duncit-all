import { keyframes } from '@mui/material';
import { Box } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

const pulse = keyframes`
  0%   { transform: scale(1); box-shadow: 0 0 0 0 currentColor; opacity: 0.95; }
  50%  { transform: scale(1.08); box-shadow: 0 0 0 8px transparent; opacity: 1; }
  100% { transform: scale(1); box-shadow: 0 0 0 0 currentColor; opacity: 0.95; }
`;

const wave = keyframes`
  0%, 100% { transform: scaleY(0.4); }
  20% { transform: scaleY(1); }
  40% { transform: scaleY(0.6); }
  60% { transform: scaleY(0.85); }
  80% { transform: scaleY(0.5); }
`;

interface Props {
  type: 'EMAIL' | 'CALL';
  status: string;
}

const COLOURS: Record<string, string> = {
  SENT: '#22c55e',
  DELIVERED: '#22c55e',
  INITIATED: '#0ea5e9',
  IN_PROGRESS: '#0ea5e9',
  RINGING: '#0ea5e9',
  COMPLETED: '#16a34a',
  FAILED: '#ef4444',
  NO_ANSWER: '#f59e0b',
  BUSY: '#f59e0b',
  QUEUED: '#6366f1',
};

const ACTIVE = new Set(['INITIATED', 'IN_PROGRESS', 'RINGING', 'QUEUED']);

/**
 * Status-aware icon used in the comms log timeline. Animates with a CSS
 * pulse while a call is in-progress and shows a sound-wave glyph when
 * a transcript is ready, so the user can scan the timeline visually.
 * Branding can swap these for actual lotties later by providing
 * mascot_lottie_url etc. — the fallback CSS animation keeps the UI
 * usable without that asset.
 */
export default function StatusVisual({ type, status }: Props) {
  const color = COLOURS[status] ?? '#6366f1';
  const animate = ACTIVE.has(status);
  const isCall = type === 'CALL';
  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        color,
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? `${color}22` : `${color}1a`),
        animation: animate ? `${pulse} 1.6s ease-in-out infinite` : 'none',
        flexShrink: 0,
      }}
    >
      {isCall ? <CallOutlinedIcon fontSize="small" /> : <EmailOutlinedIcon fontSize="small" />}
    </Box>
  );
}

export function TranscriptWave() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'primary.main' }}>
      <GraphicEqIcon fontSize="small" />
      <Box sx={{ display: 'inline-flex', gap: 0.25, alignItems: 'flex-end', height: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{
              width: 2.5,
              height: '100%',
              bgcolor: 'currentColor',
              borderRadius: 1,
              transformOrigin: 'bottom',
              animation: `${wave} 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
