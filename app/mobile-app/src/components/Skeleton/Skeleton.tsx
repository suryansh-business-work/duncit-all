import { View, type DimensionValue, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
  testID?: string;
}

/** A single placeholder block — the RN analogue of MUI's <Skeleton/>. Static
 * (no shimmer) so no animation loop runs while a loading screen is mounted. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
  testID,
}: Readonly<SkeletonProps>) {
  const { muted } = useThemeColors();

  return (
    <View
      testID={testID}
      style={[{ width, height, borderRadius: radius, backgroundColor: muted, opacity: 0.5 }, style]}
    />
  );
}
