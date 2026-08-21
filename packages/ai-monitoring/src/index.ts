/**
 * @duncit/ai-monitoring — the one AI Monitoring notice.
 *
 * Wherever a person can attach an image or a file — the native app, mWeb and
 * every portal — a chip sits beside the field saying the upload is checked by
 * AI, and opens a dialog explaining what that means. The sentences it renders
 * are edited in AI Portal > AI Monitoring > Settings, and every check it
 * describes is written to AI Portal > AI Monitoring > Logs.
 *
 * This root module is framework-free (zero dependencies, no react import) so
 * the native app can bundle it from source through Metro. The MUI chip and
 * dialog live behind `@duncit/ai-monitoring/mui`, which mWeb and the portals
 * import and the app never touches; the app renders the same resolved copy
 * through its own Tamagui view. Rule 40: share the logic, never the UI.
 */
export { AI_MONITORING_CONFIG_QUERY } from './queries';
export {
  aiMonitoringFallbackCopy,
  isAiMonitoringChipVisible,
  resolveAiMonitoringCopy,
} from './copy';
export type { AiMonitoringConfig, AiMonitoringCopy, AiMonitoringTranslate } from './types';
