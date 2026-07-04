import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

interface RevealProps {
  children: ReactNode;
  /** Retained for call-site compatibility; no longer drives a stagger. */
  index?: number;
  /** Retained for call-site compatibility; no longer drives a scale-in. */
  scale?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Formerly the app-wide entry animation (fade + rise). Entry/decorative
 * animations were removed app-wide for performance — content now renders
 * instantly. Kept as a thin, static container so the many call sites (and their
 * `index`/`scale` props) stay valid without a sweeping edit.
 */
export function Reveal({ children, style, testID }: Readonly<RevealProps>) {
  return (
    <View style={style} testID={testID}>
      {children}
    </View>
  );
}
