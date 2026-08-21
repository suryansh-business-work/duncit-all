/**
 * @duncit/ai-monitoring/mui — the MUI face of the AI Monitoring notice, for
 * mWeb and the seventeen portals.
 *
 * Behind a subpath so the native app, which imports only the framework-free
 * root, never asks Metro to resolve @mui or @apollo.
 */
export { AiMonitoringChip } from './AiMonitoringChip';
export type { AiMonitoringChipProps } from './AiMonitoringChip';
export { AiMonitoringDialog } from './AiMonitoringDialog';
export type { AiMonitoringDialogProps } from './AiMonitoringDialog';
export { AI_MONITORING_CONFIG, useAiMonitoringConfig } from './useAiMonitoringConfig';
export type { AiMonitoringState } from './useAiMonitoringConfig';
export { AI_MONITORING_FALLBACK_FLAT } from './useTranslation';
