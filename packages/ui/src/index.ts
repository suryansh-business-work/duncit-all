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
export { InfoRow } from './InfoRow';
export type { InfoRowProps, InfoRowVariant } from './InfoRow';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { BackButton, BackHeader } from './BackHeader';
export type { BackButtonProps, BackHeaderProps } from './BackHeader';
export { QueryGuard } from './QueryGuard';
export type { QueryGuardProps } from './QueryGuard';
export { useDebouncedValue } from './useDebouncedValue';
export { mergeSx } from './mergeSx';
export { ModerationBlockedDialog } from './ModerationBlockedDialog';
export type { BlockedViolation, ModerationBlockedDialogProps } from './ModerationBlockedDialog';
