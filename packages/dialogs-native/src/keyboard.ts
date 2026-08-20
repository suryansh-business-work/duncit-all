/**
 * How far bottom-anchored content must lift so the on-screen keyboard does not
 * cover it — `0` whenever the keyboard is closed.
 *
 * The subtraction is load-bearing and not self-evident: every caller sits
 * inside a `SafeAreaView` (or equivalent padding) that has already reserved
 * `bottomInset`, so lifting by the raw keyboard height would reserve that strip
 * twice and leave a nav-bar-sized gap under the keyboard on every composer in
 * the app. `Math.max` keeps the result sane on a device whose inset exceeds a
 * small floating keyboard.
 *
 * Why this exists instead of `KeyboardAvoidingView`: since Expo SDK 54 Android
 * always runs edge-to-edge, which makes `softwareKeyboardLayoutMode: "resize"`
 * a no-op — the window keeps its full height and the keyboard is drawn over it,
 * so a bottom-anchored input has to move itself. RN's `KeyboardAvoidingView`
 * measures against the un-resized window there and lands the input either
 * behind the keyboard or a nav-bar's worth too high.
 *
 * @param keyboardHeight Frame height reported by the keyboard event, measured
 *   from the bottom of the screen (so it already spans the navigation bar).
 * @param bottomInset The bottom safe-area inset an ancestor already applied.
 */
export function keyboardLift(keyboardHeight: number, bottomInset: number): number {
  if (keyboardHeight <= 0) return 0;
  return Math.max(0, keyboardHeight - bottomInset);
}
