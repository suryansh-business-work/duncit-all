import { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { isReelPreloaded, shouldExtendReelFeed } from '@duncit/utils';
import LearningReelCard from './LearningReelCard';
import type { LearningCard } from './queries';

interface Props {
  cards: LearningCard[];
  topicLabels: ReadonlyMap<string, string>;
  onNearEnd: () => void;
  onLike: (card: LearningCard) => void;
  onComments: (card: LearningCard) => void;
  onShare: (card: LearningCard) => void;
  onWatched: (card: LearningCard) => void;
}

/** The vertical Learnings reel: one video per slide, only the slide on screen
 * plays and its neighbours buffer — the Explore reels approach. */
export default function LearningReels({ cards, topicLabels, onNearEnd, onLike, onComments, onShare, onWatched }: Readonly<Props>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const toggleSound = useCallback(() => setSoundOn((on) => !on), []);
  const soundBlocked = useCallback(() => setSoundOn(false), []);
  const onSlideChange = (index: number) => {
    setActiveIndex(index);
    if (shouldExtendReelFeed(index, cards.length)) onNearEnd();
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
      {cards.map((card, index) => (
        <Box key={card.id} sx={{ height: '100%' }}>
          <LearningReelCard
            card={card}
            topicLabel={topicLabels.get(card.topic) ?? ''}
            active={index === activeIndex}
            preload={isReelPreloaded(index, activeIndex)}
            soundOn={soundOn}
            onToggleSound={toggleSound}
            onSoundBlocked={soundBlocked}
            onLike={onLike}
            onComments={onComments}
            onShare={onShare}
            onWatched={onWatched}
          />
        </Box>
      ))}
    </Slider>
  );
}
