import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

interface Props {
  /** The edges to keep clear of the notch, status bar and home indicator. Defaults to all four. */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

/**
 * `SafeAreaView` for content inside a React Native `<Modal>`.
 *
 * On iOS a modal opens its own native window, and the native `SafeAreaView`
 * measures that window — where it can report zero insets. A full-screen modal
 * then draws its header under the status bar, and its close button sits beneath
 * the clock where it cannot be tapped (the notifications screen, the story
 * viewer, the crop dialogs…).
 *
 * The insets the app's root `SafeAreaProvider` measured are the right ones for
 * a full-screen modal — it covers the same screen — and React context reaches
 * through `<Modal>`, so this pads by those instead of measuring again.
 */
export function ModalSafeArea({ edges = ALL_EDGES, style, testID, children }: Readonly<Props>) {
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {};
  if (edges.includes('top')) padding.paddingTop = insets.top;
  if (edges.includes('right')) padding.paddingRight = insets.right;
  if (edges.includes('bottom')) padding.paddingBottom = insets.bottom;
  if (edges.includes('left')) padding.paddingLeft = insets.left;

  return (
    <View testID={testID} style={[style, padding]}>
      {children}
    </View>
  );
}
