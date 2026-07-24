import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, Button, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VideoMedia from '../../components/media/VideoMedia';

export const POD_SHOP_SLIDER = gql`
  query PodShopSlider {
    branding {
      pod_shop_slider {
        url
        type
        order
        heading
        subheading
        cta_label
        cta_url
      }
    }
  }
`;

interface SliderMedia {
  url: string;
  type: string;
  order: number;
  heading?: string | null;
  subheading?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
}

const SLIDE_HEIGHT = { xs: 190, sm: 240, md: 300 };

/** Overlay copy + CTA for a slide; hoisted so it isn't redefined each render. */
function SlideOverlay({ media, onCta }: Readonly<{ media: SliderMedia; onCta: (url: string) => void }>) {
  if (!media.heading && !media.subheading && !media.cta_label) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        p: { xs: 2.5, sm: 4 },
        background:
          'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)',
      }}
    >
      {media.heading ? (
        <Typography
          variant="h4"
          sx={{ color: 'common.white', fontWeight: 950, lineHeight: 1.05, maxWidth: 360 }}
        >
          {media.heading}
        </Typography>
      ) : null}
      {media.subheading ? (
        <Typography sx={{ color: 'rgba(255,255,255,0.92)', mt: 1, maxWidth: 320, fontWeight: 600 }}>
          {media.subheading}
        </Typography>
      ) : null}
      {media.cta_label ? (
        <Button
          onClick={() => onCta(media.cta_url ?? '')}
          endIcon={<ChevronRightIcon />}
          sx={{
            mt: 2,
            alignSelf: 'flex-start',
            borderRadius: 999,
            px: 2.5,
            fontWeight: 800,
            textTransform: 'none',
            bgcolor: 'common.white',
            color: 'text.primary',
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          {media.cta_label}
        </Button>
      ) : null}
    </Box>
  );
}

/** The global Pod Shop top slider (image/video + admin overlay copy/CTA) —
 * admin-managed from the products portal, shown above the Pod Shop grid. Hidden
 * until media is configured. mWeb twin of the mobile PodShopSlider. */
export default function PodShopSlider() {
  const navigate = useNavigate();
  const { data } = useQuery(POD_SHOP_SLIDER, { fetchPolicy: 'cache-and-network' });
  const media = [...(data?.branding?.pod_shop_slider ?? [])] as SliderMedia[];
  media.sort((a, b) => a.order - b.order);

  const onCta = (url: string) => {
    const target = url.trim();
    if (!target) return;
    if (target.startsWith('http')) {
      globalThis.open(target, '_blank', 'noopener');
    } else {
      navigate(target);
    }
  };

  if (media.length === 0) return null;
  return (
    <Box
      data-testid="pod-shop-slider"
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        '.slick-dots': { bottom: 12 },
        '.slick-dots li button:before': { color: 'common.white', opacity: 0.6 },
        '.slick-dots li.slick-active button:before': { opacity: 1 },
      }}
    >
      <Slider
        dots={media.length > 1}
        arrows={false}
        infinite={media.length > 1}
        autoplay={media.length > 1}
        autoplaySpeed={4500}
        slidesToShow={1}
        slidesToScroll={1}
      >
        {media.map((m) => (
          <Stack key={m.url} sx={{ position: 'relative' }}>
            {m.type === 'VIDEO' ? (
              <VideoMedia src={m.url} height={SLIDE_HEIGHT} />
            ) : (
              <Box
                component="img"
                src={m.url}
                alt={m.heading || 'Pod Shop'}
                sx={{ width: '100%', height: SLIDE_HEIGHT, objectFit: 'cover' }}
              />
            )}
            <SlideOverlay media={m} onCta={onCta} />
          </Stack>
        ))}
      </Slider>
    </Box>
  );
}
