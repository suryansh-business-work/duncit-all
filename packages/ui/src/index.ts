/**
 * @duncit/ui — shared MUI portal primitives.
 *
 * One copy of the KPI stat tile, status chip, label/value detail row, page and
 * back headers, query guard trio, the debounced-value hook and the
 * URL-backed tab selection that every portal used to hand-roll.
 */
export { StatCard, usageColor } from './stat-card';
export type { StatCardBarColor, StatCardIconBox, StatCardLayout, StatCardProps } from './stat-card';
export { STATUS_CHIP_COLORS, StatusChip } from './StatusChip';
export type { StatusChipColor, StatusChipProps, StatusColorMap } from './StatusChip';
export { InfoRow } from './InfoRow';
export type { InfoRowProps, InfoRowVariant } from './InfoRow';
export { ImagePreview } from './ImagePreview';
export type { ImagePreviewProps } from './ImagePreview';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { BackButton, BackHeader } from './BackHeader';
export type { BackButtonProps, BackHeaderProps } from './BackHeader';
export { QueryGuard } from './QueryGuard';
export type { QueryGuardProps } from './QueryGuard';
export { useDebouncedValue } from './useDebouncedValue';
export { TAB_PARAM, useTabParam } from './useTabParam';
export type { UseTabParamOptions } from './useTabParam';
export { mergeSx } from './mergeSx';
export { ModerationBlockedDialog } from './ModerationBlockedDialog';
export type { BlockedViolation, ModerationBlockedDialogProps } from './ModerationBlockedDialog';
export { PodParticipationTimeline } from './PodParticipationTimeline';
export type { PodParticipationTimelineProps } from './PodParticipationTimeline';
export { LanguageSelect } from './LanguageSelect';
export type { LanguageOption, LanguageSelectProps } from './LanguageSelect';
export { default as AttendanceChip } from './AttendanceChip';
export type { PodAttendanceSummary } from './AttendanceChip';
export { FinanceWaterfallList, buildWaterfallLines } from './finance-waterfall';
export type { PodFinanceWaterfall, WaterfallLine } from './finance-waterfall';
