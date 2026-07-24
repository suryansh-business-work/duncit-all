import { gql, useQuery } from '@apollo/client';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box } from '@mui/material';
import VideoMedia from '../../components/media/VideoMedia';

export const POD_SHOP_SLIDER = gql`
  query PodShopSlider {
    branding {
      pod_shop_slider {
        url
        type
        order
      }
    }
  }
`;

interface SliderMedia {
  url: string;
  type: string;
  order: number;
}

const SLIDE_HEIGHT = { xs: 160, sm: 220, md: 300 };

/** The global Pod Shop top slider (image/video) — admin-managed from the
 * products portal, shown above the Pod Shop grid. Hidden until media is
 * configured. mWeb twin of the mobile PodShopSlider. */
export default function PodShopSlider() {
  const { data } = useQuery(POD_SHOP_SLIDER, {
    fetchPolicy: 'cache-and-network',
  });
  const media = [...(data?.branding?.pod_shop_slider ?? [])] as SliderMedia[];
  media.sort((a, b) => a.order - b.order);

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
        {media.map((m) =>
          m.type === 'VIDEO' ? (
            <VideoMedia key={m.url} src={m.url} height={SLIDE_HEIGHT} />
          ) : (
            <Box
              key={m.url}
              component="img"
              src={m.url}
              alt="Pod Shop"
              sx={{ width: '100%', height: SLIDE_HEIGHT, objectFit: 'cover' }}
            />
          ),
        )}
      </Slider>
    </Box>
  );
}
