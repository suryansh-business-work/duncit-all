import { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { isReelPreloaded, reelFeed, shouldExtendReelFeed } from '@duncit/utils';
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
  // A random order that never ends: one more shuffled pass of the pods is dealt
  // as the viewer nears the end (shared with native through @duncit/utils).
  const [seed] = useState(() => Date.now());
  const [cycles, setCycles] = useState(1);
  const reels = useMemo(() => reelFeed(pods, (pod) => pod.id, seed, cycles), [pods, seed, cycles]);
  const slides = interleaveAds(reels, ads, AD_EVERY_REELS);
  // Only the slide on screen plays; the ones either side buffer ahead. The
  // sound choice carries across swipes.
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const toggleSound = useCallback(() => setSoundOn((on) => !on), []);
  const soundBlocked = useCallback(() => setSoundOn(false), []);
  const onSlideChange = (index: number) => {
    setActiveIndex(index);
    if (shouldExtendReelFeed(index, slides.length)) setCycles((count) => count + 1);
  };
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
      afterChange={onSlideChange}
    >
      {slides.map((entry, index) => {
        if (isAdEntry(entry)) {
          return (
            <Box key={entry.__ad.id} data-testid={`explore-ad-slide-${entry.__ad.id}`} sx={{ height: '100%' }}>
              <AdSlide ad={entry.__ad} />
            </Box>
          );
        }
        const p = entry.item;
        return (
          <Box key={entry.key} data-testid={`explore-pod-slide-${p.id}`} sx={{ height: '100%' }}>
            <ExplorePodCard
              pod={p}
              club={clubsById.get(p.club_id)}
              location={locById.get(p.location_id)}
              saved={isSaved(p.id)}
              savePending={pendingSave.has(p.id)}
              onToggleSave={() => onToggleSave(p.id)}
              viewerId={viewerId}
              sound={{ on: soundOn, active: index === activeIndex, onToggle: toggleSound, onBlocked: soundBlocked }}
              preload={isReelPreloaded(index, activeIndex)}
            />
          </Box>
        );
      })}
    </Slider>
  );
}
