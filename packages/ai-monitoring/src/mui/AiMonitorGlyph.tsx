import { Box } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AI_MONITOR_GRADIENT_CSS, AI_MONITOR_MOTION, AI_MONITOR_RINGS } from '@duncit/utils';
import { aiBreathe, aiMotion, aiRipple } from './motion';

const { breatheMs, rippleMs, ringTo } = AI_MONITOR_MOTION;

export interface AiMonitorGlyphProps {
  /** Diameter of the gradient orb, in px. */
  size?: number;
  /** Emit rings. On while a check is actually running, off when the glyph is
   * only a label's badge. */
  rings?: boolean;
}

/**
 * The AI Monitoring badge: a gradient orb with a spark in it, breathing, and
 * emitting rings while a check runs.
 *
 * This is the one drawing of "AI is here" on the MUI surfaces — the chip beside
 * an upload field, the dialog that explains it, the pill on a pod row and the
 * overlay behind Create Pod all render THIS, at different sizes, rather than
 * four `AutoAwesomeIcon`s that each animate a little differently.
 *
 * `aria-hidden`: it is decoration beside a label that already says the words,
 * so a screen reader must not announce it twice. Native twin —
 * `AiMonitorGlyph` in the app's `components/ai-monitoring/`.
 */
export function AiMonitorGlyph({ size = 24, rings = false }: Readonly<AiMonitorGlyphProps>) {
  // Room for a ring at full flight, or none at all when there are no rings —
  // an empty halo around a chip-sized badge would push its label off-centre.
  const frame = rings ? Math.round(size * ringTo) : size;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: frame,
        height: frame,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      {rings
        ? AI_MONITOR_RINGS.map((ring) => (
            <Box
              key={ring.id}
              sx={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: 'rgba(236,72,153,0.85)',
                animationDelay: `${ring.delayMs}ms`,
                ...aiMotion(`${aiRipple} ${rippleMs}ms ease-out infinite`),
              }}
            />
          ))
        : null}
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: AI_MONITOR_GRADIENT_CSS,
          ...aiMotion(`${aiBreathe} ${breatheMs}ms ease-in-out infinite`),
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: Math.round(size * 0.56), color: '#fff' }} />
      </Box>
    </Box>
  );
}
