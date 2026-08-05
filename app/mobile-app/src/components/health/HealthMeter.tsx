import Svg, { Path } from 'react-native-svg';
import { Text, YStack } from 'tamagui';

import { clampScore, healthBandColor } from '@/utils/health';

export interface HealthMeterProps {
  score: number;
  band: string;
  label?: string;
  size?: number;
  thickness?: number;
  caption?: string | null;
}

/** Half-circle gauge with a numeric readout — RN twin of mWeb's <HealthMeter/>.
 * Rendered as an SVG arc so the colour shifts with the score band. */
export function HealthMeter({
  score,
  band,
  label = 'Account Health',
  size = 168,
  thickness = 14,
  caption,
}: Readonly<HealthMeterProps>) {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = Math.PI * radius;
  const safeScore = clampScore(score);
  const filled = (safeScore / 100) * circumference;
  const color = healthBandColor(band);
  const height = size / 2 + thickness;
  /* The half circle is drawn where it is shown — left end, over the top, right
   * end — instead of drawing a full circle, rotating the <Svg> 180° and
   * clipping the bottom half. That rotation is a React Native style transform:
   * it applies on device but is dropped when the app renders as web, leaving
   * the unrotated arc in the clipped half, where only its two round end caps
   * showed. This geometry needs no transform, so every target draws it alike. */
  const arc = `M ${thickness / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${center}`;

  return (
    <YStack alignItems="center" testID="health-meter">
      <YStack width={size} height={height}>
        <Svg width={size} height={height}>
          <Path
            d={arc}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={thickness}
            strokeLinecap="round"
          />
          <Path
            d={arc}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
          />
        </Svg>
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="flex-end"
        >
          <Text fontWeight="700" fontSize={size * 0.28} lineHeight={size * 0.3} color={color}>
            {safeScore}
          </Text>
          <Text fontSize={12} fontWeight="600" color="$muted">
            / 100
          </Text>
        </YStack>
      </YStack>
      <Text fontSize={12} fontWeight="700" textTransform="uppercase" color="$muted" marginTop={8}>
        {label}
      </Text>
      {caption ? (
        <Text fontSize={12} color="$muted" textAlign="center" marginTop={2}>
          {caption}
        </Text>
      ) : null}
    </YStack>
  );
}
