import type { ViewStyle } from 'react-native';

/**
 * The style a `SafeAreaView` MUST carry when it sits inside a height-capped
 * modal card.
 *
 * React Native defaults `flexShrink` to 0, and `SafeAreaView` is a plain View.
 * Put one between a `maxHeight`-capped card and its `ScrollView` and the whole
 * subtree measures at intrinsic content height: the scroller never scrolls, the
 * content spills past the rounded card, and the footer is pushed off-screen.
 * `minHeight: 0` is the other half — without it a flex child refuses to shrink
 * below its content on some RN versions.
 *
 * This exists as a constant rather than 26 inline literals because it was
 * getting fixed one dialog at a time, each time it was reported (see the
 * comments in `PodEditDialog` and `CoverPickerDialog`, which document the same
 * discovery twice).
 *
 * New dialogs should not need it at all — use {@link DuncitDialog}, which has
 * no intermediate view between the card and the scroller.
 */
export const SHEET_SAFE_AREA: ViewStyle = { flexShrink: 1, minHeight: 0 };
