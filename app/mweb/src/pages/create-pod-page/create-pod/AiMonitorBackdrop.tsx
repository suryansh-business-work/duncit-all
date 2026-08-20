import { Backdrop, Box, Stack, Typography, keyframes } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AI_MONITOR_GRADIENT_CSS } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

/** Rings leaving the badge — the check is still reading. */
const ripple = keyframes`
  0%   { transform: scale(0.85); opacity: 0.55; }
  100% { transform: scale(1.95); opacity: 0; }
`;

/** The badge itself, breathing so the wait never looks frozen. */
const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
`;

/** The scan line crossing the track under the title. */
const scan = keyframes`
  0%   { transform: translateX(-70%); }
  100% { transform: translateX(270%); }
`;

/** Two rings, offset, so one is always mid-flight. Stable ids, never indexes. */
const RINGS = [
  { id: 'ripple-lead', delay: '0s' },
  { id: 'ripple-trail', delay: '0.9s' },
];

/**
 * The overlay a host waits behind from the moment they press Create Pod until
 * the AI content check answers.
 *
 * It blocks on purpose: the pod is being read and published, so an editable
 * form underneath would be a form whose edits are already too late. Native twin
 * — `AiMonitorOverlay` (rule 27).
 */
export default function AiMonitorBackdrop({ open }: Readonly<{ open: boolean }>) {
  const { t } = useTranslation();
  return (
    <Backdrop
      open={open}
      data-testid="create-pod-ai-monitor"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1, bgcolor: 'rgba(3,7,18,0.74)', backdropFilter: 'blur(8px)', p: 2 }}
    >
      <Stack
        spacing={1.25}
        alignItems="center"
        sx={{ width: 'min(340px, calc(100vw - 32px))', px: 3, py: 3.5, borderRadius: '16px', textAlign: 'center', color: '#fff', bgcolor: 'rgba(17,24,39,0.94)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 24px 70px rgba(0,0,0,0.42)' }}
      >
        <Box sx={{ position: 'relative', width: 76, height: 76, display: 'grid', placeItems: 'center' }}>
          {RINGS.map((ring) => (
            <Box
              key={ring.id}
              aria-hidden
              sx={{ position: 'absolute', width: 56, height: 56, borderRadius: '50%', border: '2px solid', borderColor: 'rgba(236,72,153,0.85)', animation: `${ripple} 1.8s ease-out infinite`, animationDelay: ring.delay }}
            />
          ))}
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', background: AI_MONITOR_GRADIENT_CSS, animation: `${breathe} 1.8s ease-in-out infinite` }}>
            <AutoAwesomeIcon sx={{ fontSize: 26 }} />
          </Box>
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('mweb.createPod.aiMonitoringTitle')}
        </Typography>
        <Box aria-hidden sx={{ width: '100%', height: 4, borderRadius: 999, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.14)' }}>
          <Box sx={{ width: '38%', height: '100%', borderRadius: 999, background: AI_MONITOR_GRADIENT_CSS, animation: `${scan} 1.4s ease-in-out infinite` }} />
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          {t('mweb.createPod.aiMonitoringNote')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          {t('mweb.createPod.aiMonitoringHold')}
        </Typography>
      </Stack>
    </Backdrop>
  );
}
