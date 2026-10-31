import { Chip } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { isHexColor } from '@duncit/regex';
import { AA_TEXT, contrastRatio } from '@duncit/theme';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  /** The pair, e.g. "Primary / On primary". */
  pair: string;
  fill: string;
  ink: string;
}

/**
 * How readable a label is on its fill (WCAG 1.4.3): green at 4.5:1 and over,
 * a warning under it. A colour that is not hex (a stored rgba) cannot be
 * measured here, so the chip says so instead of guessing.
 */
export default function ContrastChip({ pair, fill, ink }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!isHexColor(fill) || !isHexColor(ink)) {
    return <Chip size="small" variant="outlined" label={t('marketing.occasions.contrast.unknown', { vars: { pair } })} />;
  }
  const ratio = contrastRatio(fill, ink);
  const ok = ratio >= AA_TEXT;
  const vars = { pair, ratio: ratio.toFixed(1) };
  return (
    <Chip
      size="small"
      color={ok ? 'success' : 'warning'}
      variant={ok ? 'outlined' : 'filled'}
      icon={ok ? <CheckCircleRoundedIcon /> : <WarningAmberRoundedIcon />}
      label={t(ok ? 'marketing.occasions.contrast.pass' : 'marketing.occasions.contrast.low', { vars })}
    />
  );
}
