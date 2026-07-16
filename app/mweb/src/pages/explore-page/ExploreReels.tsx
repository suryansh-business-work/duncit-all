import { Box } from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import ExplorePodCard from './ExplorePodCard';
import AdSlide from '../../components/ads/AdSlide';
import { interleaveAds, isAdEntry } from '../../components/ads/AdSlot';
import { useActiveAds } from '../../components/ads/useActiveAds';

const AD_EVERY_REELS = 5;

interface ExploreReelsProps {
  pods: any[];
  clubsById: Map<string, any>;
  locById: Map<string, any>;
  viewerId: string | null;
  isSaved: (id: string) => boolean;
  pendingSave: Set<string>;
  onToggleSave: (id: string) => void;
}

/** The Explore vertical reel: full-viewport pod slides with a sponsored slide
 * woven in after every 5 reels (EXPLORE_SCROLL inventory; none → pods only). */
export default function ExploreReels({
  pods,
  clubsById,
  locById,
  viewerId,
  isSaved,
  pendingSave,
  onToggleSave,
}: Readonly<ExploreReelsProps>) {
  const { ads } = useActiveAds('EXPLORE_SCROLL');
  const slides = interleaveAds(pods, ads, AD_EVERY_REELS);
  return (
    <Slider
      vertical
      verticalSwiping
      slidesToShow={1}
      slidesToScroll={1}
      arrows={false}
      infinite={false}
      speed={450}
      swipeToSlide
      touchThreshold={12}
      adaptiveHeight={false}
    >
      {slides.map((entry) => {
        if (isAdEntry(entry)) {
          return (
            <Box key={entry.__ad.id} sx={{ height: '100%' }}>
              <AdSlide ad={entry.__ad} />
            </Box>
          );
        }
        const p = entry as any;
        return (
          <Box key={p.id} sx={{ height: '100%' }}>
            <ExplorePodCard
              pod={p}
              club={clubsById.get(p.club_id)}
              location={locById.get(p.location_id)}
              saved={isSaved(p.id)}
              savePending={pendingSave.has(p.id)}
              onToggleSave={() => onToggleSave(p.id)}
              viewerId={viewerId}
            />
          </Box>
        );
      })}
    </Slider>
  );
}
