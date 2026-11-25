import { Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/shell';
import { crmQualityTone, type CrmQualityTone } from '@duncit/utils';

/** The score band colours the server assigns (red 0-39, yellow 40-79, green 80-100 by default). */
export type QualityTone = CrmQualityTone;

/** The band tone's colour, an unknown one as the lowest band (shared with the Duncit CRM app). */
export const toneOf = crmQualityTone;

/** Ring sizes in theme spacing units: the compact listing ring and the detail-page ring. */
const SIZE_UNITS = { small: 5, large: 12 } as const;
const THICKNESS = { small: 4.5, large: 4 } as const;

export interface QualityScoreRingProps {
  /** 0-100, or null when the lead has not been scored yet. */
  score: number | null | undefined;
  tone?: string | null;
  /** The classification ("Excellent"), read out with the score. */
  label?: string | null;
  size?: keyof typeof SIZE_UNITS;
  /** Makes the ring a button (open the breakdown). */
  onClick?: () => void;
}

/**
 * A lead's Lead Quality Score as a circular progress ring out of 100, the
 * number in the middle. The unfilled part of the ring is the points still
 * unearned. It never shows more than 100, and its colour is the score band's.
 */
export default function QualityScoreRing({ score, tone, label, size = 'small', onClick }: Readonly<QualityScoreRingProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const scored = typeof score === 'number' && Number.isFinite(score);
  const value = scored ? Math.min(Math.max(score, 0), 100) : 0;
  const diameter = theme.spacing(SIZE_UNITS[size]);
  const shown = scored ? String(Math.round(value)) : '—';
  const aria = scored
    ? t('crm.leadQuality.ringAria', { vars: { score: shown, label: label ?? '' } })
    : t('crm.leadQuality.notScored');
  const ring = (
    <Box role="img" aria-label={aria} sx={{ position: 'relative', display: 'inline-flex', width: diameter, height: diameter, flexShrink: 0 }}>
      <CircularProgress variant="determinate" value={100} size={diameter} thickness={THICKNESS[size]} sx={{ color: 'action.hover', position: 'absolute' }} aria-hidden />
      <CircularProgress variant="determinate" value={value} size={diameter} thickness={THICKNESS[size]} color={toneOf(tone)} aria-hidden />
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} aria-hidden>
        <Typography variant={size === 'large' ? 'h5' : 'caption'} component="span" sx={{ fontWeight: 700, lineHeight: 1 }}>
          {shown}
        </Typography>
        {size === 'large' && scored ? (
          <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
            {t('crm.leadQuality.outOf100')}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
  if (!onClick) return ring;
  return (
    <ButtonBase onClick={onClick} aria-label={t('crm.leadQuality.openBreakdown', { vars: { score: shown } })} sx={{ borderRadius: '50%' }} focusRipple>
      {ring}
    </ButtonBase>
  );
}
