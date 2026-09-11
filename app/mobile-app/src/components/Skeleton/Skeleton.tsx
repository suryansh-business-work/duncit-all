import { View, type DimensionValue, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
  testID?: string;
}

/** The ink at MUI's skeleton strength, so a placeholder block is the same soft
 * grey in both apps and reads on the page ground and on a card alike. */
const BLOCK_OPACITY = 0.1;

/** A single placeholder block — the RN analogue of MUI's <Skeleton/>. Static
 * (no shimmer) so no animation loop runs while a loading screen is mounted. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
  testID,
}: Readonly<SkeletonProps>) {
  const { color } = useThemeColors();

  return (
    <View
      testID={testID}
      style={[
        { width, height, borderRadius: radius, backgroundColor: color, opacity: BLOCK_OPACITY },
        style,
      ]}
    />
  );
}
