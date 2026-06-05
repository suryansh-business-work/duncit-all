import Svg, { Circle } from 'react-native-svg';
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
}: HealthMeterProps) {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = Math.PI * radius;
  const safeScore = clampScore(score);
  const filled = (safeScore / 100) * circumference;
  const color = healthBandColor(band);

  return (
    <YStack alignItems="center" testID="health-meter">
      <YStack width={size} height={size / 2 + thickness} overflow="hidden">
        <Svg width={size} height={size} style={{ transform: [{ rotate: '180deg' }] }}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={thickness}
            strokeDasharray={`${circumference} ${circumference * 2}`}
            strokeLinecap="round"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={`${filled} ${circumference * 2}`}
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
          <Text fontWeight="900" fontSize={size * 0.28} lineHeight={size * 0.3} color={color}>
            {safeScore}
          </Text>
          <Text fontSize={12} fontWeight="800" color="$muted">
            / 100
          </Text>
        </YStack>
      </YStack>
      <Text fontSize={12} fontWeight="900" textTransform="uppercase" color="$muted" marginTop={8}>
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
