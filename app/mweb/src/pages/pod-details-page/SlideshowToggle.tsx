import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  playing: boolean;
  onToggle: () => void;
  /** The corner it sits in — top-right where a slide's own copy fills the bottom. */
  corner?: 'bottomLeft' | 'topRight';
}

const CORNERS = {
  bottomLeft: { left: 12, bottom: 12 },
  topRight: { right: 12, top: 12 },
} as const;

/**
 * Pause / play for the hero's auto-advancing carousel. Anything that moves on
 * its own for more than five seconds needs a way to stop it (WCAG 2.2.2), so the
 * control sits over the photo's bottom-left corner, opposite the slide counter.
 */
export default function SlideshowToggle({ playing, onToggle, corner = 'bottomLeft' }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = playing ? t('mweb.a11y.pauseSlideshow') : t('mweb.a11y.playSlideshow');
  return (
    <DuncitIconButton
      size="small"
      onClick={onToggle}
      aria-label={label}
      data-testid="slideshow-toggle"
      sx={{
        position: 'absolute',
        ...CORNERS[corner],
        zIndex: 2,
        width: 32,
        height: 32,
        bgcolor: 'background.paper',
        color: 'text.primary',
        '&:hover': { bgcolor: 'background.paper' },
      }}
    >
      {playing ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
    </DuncitIconButton>
  );
}
