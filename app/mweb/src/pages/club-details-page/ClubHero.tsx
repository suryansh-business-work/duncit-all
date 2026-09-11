import { useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { isVideoMedia } from '@duncit/utils';
import MomentLightbox from '../../components/moments/MomentLightbox';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import VideoMedia from '../../components/media/VideoMedia';
import { useTranslation } from '../../i18n/useTranslation';
import ClubHeroActions from './ClubHeroActions';

interface Props {
  media: { url: string; type: string }[];
  title: string;
  saved: boolean;
  saveLoading?: boolean;
  following: boolean;
  onBack: () => void;
  onToggleFollow: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

/** Full-bleed hero with the calm design's 24px bottom corners (the native
 * details hero is full-bleed too). */
const FRAME_SX = {
  position: 'relative',
  mt: -2,
  mx: { xs: -2, sm: -3 },
  borderRadius: '0 0 24px 24px',
  overflow: 'hidden',
} as const;

const arrowBtn = (theme: Theme) => ({
  position: 'absolute' as const,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  bgcolor: alpha(theme.palette.common.black, 0.35),
  color: 'common.white',
  width: 40,
  height: 40,
  minHeight: 40,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.5) },
});

function PrevArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton size="small" onClick={onClick} aria-label={t('mweb.common.previous')} sx={(theme) => ({ ...arrowBtn(theme), left: 12 })}>
      <ChevronLeftIcon />
    </DuncitIconButton>
  );
}

function NextArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton size="small" onClick={onClick} aria-label={t('mweb.clubDetails.next')} sx={(theme) => ({ ...arrowBtn(theme), right: 12 })}>
      <ChevronRightIcon />
    </DuncitIconButton>
  );
}

export default function ClubHero({
  media,
  title,
  saved,
  saveLoading,
  following,
  onBack,
  onToggleFollow,
  onToggleSave,
  onShare,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const overlay = (
    <ClubHeroActions
      saved={saved}
      saveLoading={saveLoading}
      following={following}
      onBack={onBack}
      onToggleFollow={onToggleFollow}
      onToggleSave={onToggleSave}
      onShare={onShare}
    />
  );

  if (media.length === 0) {
    return (
      <Box
        sx={{
          ...FRAME_SX,
          height: 240,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GroupsIcon sx={{ fontSize: 72, color: 'secondary.main' }} />
        {overlay}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...FRAME_SX,
        '.slick-dots': { bottom: 12 },
        '.slick-dots li button:before': { color: 'common.white', opacity: 0.6 },
        '.slick-dots li.slick-active button:before': { opacity: 1 },
      }}
    >
      <Slider
        dots
        arrows={media.length > 1}
        prevArrow={<PrevArrow />}
        nextArrow={<NextArrow />}
        infinite={media.length > 1}
        autoplay={media.length > 1}
        autoplaySpeed={5000}
        slidesToShow={1}
        slidesToScroll={1}
      >
        {media.map((m, i) =>
          isVideoMedia(m) ? (
            <VideoMedia
              key={m.url}
              src={m.url}
              height={{ xs: 280, md: 460 }}
            />
          ) : (
            <Box
              key={m.url}
              component="img"
              src={m.url}
              alt={title}
              role="button"
              aria-label={t('mweb.clubDetails.openImage')}
              onClick={() => setLightbox(i)}
              sx={{
                width: '100%',
                height: { xs: 280, md: 460 },
                objectFit: 'cover',
                cursor: 'zoom-in',
              }}
            />
          )
        )}
      </Slider>
      {overlay}
      <MomentLightbox
        moments={media}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </Box>
  );
}
