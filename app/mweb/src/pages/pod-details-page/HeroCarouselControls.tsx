import { Box } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/** The arrows and the counter over an inset details-hero carousel — the pod
 * hero and the venue hero share them. */
const arrowBtn = {
  position: 'absolute' as const,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  bgcolor: 'background.paper',
  color: 'text.primary',
  width: 36,
  height: 36,
  minHeight: 36,
  '&:hover': { bgcolor: 'background.paper' },
};

interface ArrowProps {
  testId: string;
  /** Injected by react-slick. */
  onClick?: () => void;
}

export function PrevArrow({ testId, onClick }: Readonly<ArrowProps>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton
      size="small"
      onClick={onClick}
      aria-label={t('mweb.podDetails.previousImage')}
      data-testid={testId}
      sx={{ ...arrowBtn, left: 12 }}
    >
      <ChevronLeftIcon />
    </DuncitIconButton>
  );
}

export function NextArrow({ testId, onClick }: Readonly<ArrowProps>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton
      size="small"
      onClick={onClick}
      aria-label={t('mweb.podDetails.nextImage')}
      data-testid={testId}
      sx={{ ...arrowBtn, right: 12 }}
    >
      <ChevronRightIcon />
    </DuncitIconButton>
  );
}

/** "2/5" — a surface pill over the photo's bottom-right corner. */
export function SlideCounter({ index, total }: Readonly<{ index: number; total: number }>) {
  return (
    <Box
      data-testid="slide-counter"
      sx={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 2,
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        bgcolor: 'background.paper',
        color: 'text.primary',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.2,
      }}
    >
      {index + 1}/{total}
    </Box>
  );
}
