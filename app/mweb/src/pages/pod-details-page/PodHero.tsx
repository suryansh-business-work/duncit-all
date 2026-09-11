import { useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, Stack } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { isVideoMedia } from '@duncit/utils';
import HeroOverlayActions from './HeroOverlayActions';
import VideoMedia from '../../components/media/VideoMedia';
import { useTranslation } from '../../i18n/useTranslation';

/** One height for the photo, the video and the empty placeholder. */
const HERO_HEIGHT = { xs: 280, md: 420 };

/** The hero sits inside the page padding as a 24px-cornered block. */
const heroFrame = {
  position: 'relative' as const,
  borderRadius: '24px',
  overflow: 'hidden',
  bgcolor: 'action.hover',
};

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

function PrevArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton
      size="small"
      onClick={onClick}
      aria-label={t('mweb.podDetails.previousImage')}
      sx={{ ...arrowBtn, left: 12 }}
    >
      <ChevronLeftIcon />
    </DuncitIconButton>
  );
}

function NextArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton
      size="small"
      onClick={onClick}
      aria-label={t('mweb.podDetails.nextImage')}
      sx={{ ...arrowBtn, right: 12 }}
    >
      <ChevronRightIcon />
    </DuncitIconButton>
  );
}

/** "2/5" — a surface pill over the photo's bottom-right corner. */
function SlideCounter({ index, total }: Readonly<{ index: number; total: number }>) {
  return (
    <Box
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

interface Props {
  media: { url: string; type: string }[];
  title: string;
  saved: boolean;
  saveLoading?: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

/**
 * The top bar and the pod's cover media: a carousel of its photos and clips
 * inside the page padding, or a quiet placeholder when it has none. The title
 * is not repeated over the photo — it leads the overview right below.
 */
export default function PodHero({
  media,
  title,
  saved,
  saveLoading,
  onBack,
  onToggleSave,
  onShare,
}: Readonly<Props>) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const topBar = (
    <HeroOverlayActions
      onBack={onBack}
      saved={saved}
      saveLoading={saveLoading}
      onToggleSave={onToggleSave}
      onShare={onShare}
    />
  );

  if (media.length === 0) {
    return (
      <Stack spacing={2}>
        {topBar}
        <Box sx={{ ...heroFrame, height: HERO_HEIGHT, display: 'grid', placeItems: 'center' }}>
          <EventIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {topBar}
      <Box sx={heroFrame}>
        <Slider
          dots={false}
          arrows={media.length > 1}
          prevArrow={<PrevArrow />}
          nextArrow={<NextArrow />}
          infinite={media.length > 1}
          autoplay={media.length > 1}
          autoplaySpeed={4500}
          afterChange={setCurrentSlide}
          slidesToShow={1}
          slidesToScroll={1}
        >
          {media.map((m) =>
            isVideoMedia(m) ? (
              <VideoMedia key={m.url} src={m.url} height={HERO_HEIGHT} />
            ) : (
              <Box
                key={m.url}
                component="img"
                src={m.url}
                alt={title}
                sx={{ width: '100%', height: HERO_HEIGHT, objectFit: 'cover', display: 'block' }}
              />
            )
          )}
        </Slider>
        {media.length > 1 && <SlideCounter index={currentSlide} total={media.length} />}
      </Box>
    </Stack>
  );
}
