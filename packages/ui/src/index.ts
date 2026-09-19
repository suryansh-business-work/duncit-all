/**
 * @duncit/ui — shared MUI portal primitives.
 *
 * One copy of the KPI stat tile, status chip, label/value detail row, page and
 * back headers, query guard trio and the debounced-value hook that every
 * portal used to hand-roll.
 */
export { StatCard, usageColor } from './stat-card';
export type { StatCardBarColor, StatCardIconBox, StatCardLayout, StatCardProps } from './stat-card';
export { STATUS_CHIP_COLORS, StatusChip } from './StatusChip';
export type { StatusChipColor, StatusChipProps, StatusColorMap } from './StatusChip';
export { ChipList } from './ChipList';
export type { ChipListProps } from './ChipList';
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
export { FormActionsRow } from './FormActionsRow';
export type { FormActionsRowProps } from './FormActionsRow';
export {
  Loader,
  LoadingOverlay,
  RequestProgressBar,
  TopProgressBar,
  getInFlightRequests,
  subscribeRequests,
  trackingFetch,
} from './loader';
export type { LoaderProps, LoaderVariant, LoadingOverlayProps, TopProgressBarProps } from './loader';
export { useDebouncedValue } from './useDebouncedValue';
export { useRouteFocus } from './useRouteFocus';
export { mergeSx } from './mergeSx';
export { RICH_TEXT_BODY_SX } from './richTextBodySx';
export { ModerationBlockedDialog } from './ModerationBlockedDialog';
export type { BlockedViolation, ModerationBlockedDialogProps } from './ModerationBlockedDialog';
export { PodParticipationTimeline } from './PodParticipationTimeline';
export type { PodParticipationTimelineProps } from './PodParticipationTimeline';
export { LanguageSelect } from './LanguageSelect';
export type { LanguageOption, LanguageSelectProps } from './LanguageSelect';
export { default as AttendanceChip } from './AttendanceChip';
export type { PodAttendanceSummary } from './AttendanceChip';
export { default as PodSeatsCell } from './PodSeatsCell';
export { FinanceWaterfallList, buildWaterfallLines } from './finance-waterfall';
export type { PodFinanceWaterfall, WaterfallLine, WaterfallTranslate } from './finance-waterfall';
export { fallbackT } from './i18n/useTranslation';
export { SpotsStepper, buildSpotsLabels, mwebSpotsLabels, shellSpotsLabels } from './spots';
export type { SpotsStepperLabels, SpotsStepperProps, SpotsTranslate } from './spots';
export { TicketDiscountField } from './ticket-discount';
export type { TicketDiscountFieldErrors, TicketDiscountFieldProps } from './ticket-discount';
export { SectionCard } from './SectionCard';
export type { SectionCardProps } from './SectionCard';
export { DistributionCard } from './DistributionCard';
export type { DistributionBucket, DistributionCardProps } from './DistributionCard';
export { FillViewport } from './FillViewport';
export type { FillViewportProps } from './FillViewport';
export { chartSeriesColor } from './chartSeriesColor';
export { categoryAxis, chartTooltip, lineTrendDataset, lineTrendOptions, valueAxis } from './chartFrame';
export { SidebarList, countBadge } from './sidebar-list';
export type { SidebarFilter, SidebarItem, SidebarListProps, SidebarOption } from './sidebar-list';
export { ScrollRail } from './ScrollRail';
export type { ScrollRailProps } from './ScrollRail';
