/**
 * @duncit/dialogs-native — the sizing contract behind the native app's one
 * dialog.
 *
 * Framework-free on purpose. The native app is a standalone npm project and
 * Metro resolves a linked package's peer imports by walking up from
 * `packages/<name>/`, which finds nothing in the Docker build — so a package
 * the app consumes must not import react, react-native or tamagui. The Tamagui
 * view (`DuncitDialog`) therefore stays in the app and imports the rules from
 * here, exactly as `@duncit/slots` keeps its logic framework-free and its MUI
 * calendar behind a subpath the app never touches.
 *
 * Its MUI twin for mWeb and the portals is `@duncit/dialogs`.
 */
export {
  dialogMetrics,
  CARD_MAX_WIDTH,
  DEFAULT_MAX_HEIGHT_RATIO,
  MIN_HEIGHT,
  type DialogMetrics,
  type DialogMetricsInput,
  type DuncitDialogVariant,
} from './metrics';
export { keyboardLift } from './keyboard';
