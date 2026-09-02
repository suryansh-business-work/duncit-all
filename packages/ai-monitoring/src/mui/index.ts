/**
 * @duncit/ai-monitoring/mui — the MUI face of the AI Monitoring notice, for
 * mWeb and the seventeen portals.
 *
 * Behind a subpath so the native app, which imports only the framework-free
 * root, never asks Metro to resolve @mui or @apollo.
 *
 * Four things render "AI is here" on these surfaces and all four are here: the
 * chip beside an upload field, the dialog behind it, the gradient pill that
 * opens an AI-monitored record, and the two shapes of the wait while a check
 * runs. They share one badge and one set of timings, so the feature moves the
 * same way wherever it turns up.
 */
export { AiMonitoringChip } from './AiMonitoringChip';
export type { AiMonitoringChipProps } from './AiMonitoringChip';
export { AiMonitoringDialog } from './AiMonitoringDialog';
export type { AiMonitoringDialogProps } from './AiMonitoringDialog';
export { AiMonitorGlyph } from './AiMonitorGlyph';
export type { AiMonitorGlyphProps } from './AiMonitorGlyph';
export { AiMonitorPill } from './AiMonitorPill';
export type { AiMonitorPillProps } from './AiMonitorPill';
export { AiProcessingOverlay } from './AiProcessingOverlay';
export type { AiProcessingOverlayProps } from './AiProcessingOverlay';
export { AiProcessingInline } from './AiProcessingInline';
export type { AiProcessingInlineProps } from './AiProcessingInline';
export { aiBreathe, aiMotion, aiPulse, aiRipple, aiScan, aiSheen, aiSweep, aiTwinkle } from './motion';
export { AI_MONITORING_CONFIG, useAiMonitoringConfig } from './useAiMonitoringConfig';
export type { AiMonitoringState } from './useAiMonitoringConfig';
export { AI_MONITORING_FALLBACK_FLAT } from './useTranslation';
