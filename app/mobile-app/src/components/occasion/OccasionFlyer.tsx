import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { neutral } from '@duncit/auth-tokens';
import { logs } from '@duncit/logs';
import { flyerCycle, type OccasionArtwork } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import {
  TRAIL_DOTS,
  dotStyle,
  flyerFrame,
  flyerStyle,
  trailDotLook,
  trailDotPoint,
  type Box,
  type FlyerTrack,
} from './motion-worklets';
import { vectorPaint, type FlyerEntry } from './scene-parts';

/** Artwork units of room round a picture's box: antlers and hat tips poke out of it. */
const ART_PAD = 12;
const DOTS = Array.from({ length: TRAIL_DOTS }, (_, k) => k);

interface TrailProps {
  track: FlyerTrack;
  color: string;
  artHeight: number;
  box: Box;
  clock: SharedValue<number>;
}

/** One sparkle of the dust a flyer leaves: older ones smaller and fainter. */
function TrailDot({
  k,
  track,
  color,
  artHeight,
  box,
  clock,
}: Readonly<TrailProps & { k: number }>) {
  const { r, alpha } = trailDotLook(k);
  const place = useAnimatedStyle(() =>
    dotStyle(trailDotPoint(track, clock.value, box, k, artHeight), alpha),
  );
  return (
    <Animated.View
      testID="occasion-trail-dot"
      style={[
        styles.piece,
        { left: -r, top: -r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color },
        place,
      ]}
    />
  );
}

/** A vector flyer, drawn facing right; its view mirrors it for a right-to-left pass. */
function ArtworkSvg({ artwork, scale }: Readonly<{ artwork: OccasionArtwork; scale: number }>) {
  const layers = useMemo(
    () =>
      artwork.layers.map((layer, n) => ({ id: `layer-${n}`, layer, paint: vectorPaint(layer) })),
    [artwork],
  );
  const viewWidth = artwork.width + ART_PAD * 2;
  const viewHeight = artwork.height + ART_PAD * 2;
  return (
    <Svg
      width={viewWidth * scale}
      height={viewHeight * scale}
      viewBox={`${-ART_PAD} ${-ART_PAD} ${viewWidth} ${viewHeight}`}
    >
      {layers.map(({ id, layer, paint }) => (
        <Path
          key={id}
          d={layer.path}
          transform={`translate(${layer.x} ${layer.y})`}
          fill={paint.fill}
          stroke={paint.stroke}
          strokeWidth={paint.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

/**
 * Artwork that crosses the screen now and then — Santa's sleigh, a witch, a
 * kite — or an uploaded picture, with a soft shadow, a gentle bob and, when
 * the look gives it a colour, a trail of sparkles.
 */
export const OccasionFlyer = memo(function OccasionFlyer({
  entry,
  box,
  clock,
}: Readonly<{ entry: FlyerEntry; box: Box; clock: SharedValue<number> }>) {
  const { flyer, artwork, index } = entry;
  const track = useMemo<FlyerTrack>(
    () => ({ flyer, cycle: flyerCycle(flyer), index }),
    [flyer, index],
  );
  const mirrored = flyer.direction === 'RTL';
  const scale = artwork ? flyer.size / artwork.width : 1;
  const pose = useAnimatedStyle(() => flyerStyle(flyerFrame(track, clock.value, box), mirrored));
  // Where the trail leaves from, as the engine measures it: a vector's drawn
  // height, or half an uploaded picture's width (its box is drawn to match).
  const artHeight = artwork ? artwork.height * scale : flyer.size / 2;
  const frame = artwork
    ? {
        left: -ART_PAD * scale,
        top: -ART_PAD * scale,
        width: (artwork.width + ART_PAD * 2) * scale,
        height: (artwork.height + ART_PAD * 2) * scale,
      }
    : { left: 0, top: -flyer.size / 4, width: flyer.size, height: flyer.size };

  return (
    <>
      {flyer.trail_color === ''
        ? null
        : DOTS.map((k) => (
            <TrailDot
              key={`dot-${k}`}
              k={k}
              track={track}
              color={flyer.trail_color}
              artHeight={artHeight}
              box={box}
              clock={clock}
            />
          ))}
      <Animated.View testID="occasion-flyer" style={[styles.piece, styles.shadow, frame, pose]}>
        {artwork ? (
          <ArtworkSvg artwork={artwork} scale={scale} />
        ) : (
          <AppImage
            testID="occasion-flyer-image"
            source={{ uri: flyer.image_url }}
            style={styles.picture}
            resizeMode="contain"
            onError={() => logs.mobileApp.warn('occasion', 'flyerImage', { url: flyer.image_url })}
          />
        )}
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
  // So it floats above the page instead of lying on it (the web painter's shadow).
  shadow: {
    shadowColor: neutral[900],
    shadowOpacity: 0.28,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 10 },
  },
  picture: { width: '100%', height: '100%' },
});
