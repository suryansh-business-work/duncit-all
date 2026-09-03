/**
 * @duncit/slots — one slot-selection experience for every surface.
 *
 * This entry point is framework-free, so React Native, the browser and Node can
 * all import it. `@duncit/slots/mui` adds the MUI calendar for the portals and
 * mWeb.
 *
 * The app renders these same helpers through its own Tamagui view in
 * `app/mobile-app/src/components/slots/`. It lives there, not here, because the
 * native app compiles linked packages from their own SOURCE — a `react` or
 * `tamagui` import inside this package resolves by walking up from
 * `packages/slots/` and finds nothing in CI or Docker.
 */
export {
  groupSlotsByDay,
  resolveSlotDay,
  slotDayBounds,
  slotDayKeys,
  slotDayLabel,
  slotPriceLabel,
  slotRangeLabel,
  slotSpanLabel,
  slotTileLines,
  slotTimeLabel,
  withCurrentSlot,
} from './group';
export {
  buildSlotLabels,
  mwebCurrentLabel,
  mwebMeetingLabels,
  mwebSlotLabels,
  shellCurrentLabel,
  shellMeetingLabels,
  shellSlotLabels,
  type SlotTranslate,
} from './labels';
export {
  addMonths,
  buildMonthGrid,
  clampMonth,
  monthKeyOf,
  weekdayIndex,
  weekdayInitials,
} from './month';
export type { CalendarSlot, SlotDay, SlotFormatter, SlotLabels } from './types';
// Venue availability: the rules behind the add-slot form and the recurring
// dialog. Framework-free so the native app's Tamagui twin runs the same ones.
export { slotCoveredDays, slotCoversDay, wholeDayWindow } from './slot-window';
export type { SlotSpan } from './slot-window';
export {
  checkSlotDraft,
  emptyDraft,
  isDraftIncomplete,
  MAX_FUTURE_DAYS,
  minEndTime,
  minTimeOn,
  NO_SPACE,
  slotIssueMessage,
} from './slot-draft';
export type { SlotDraft, SlotIssueCode, Translate } from './slot-draft';
export {
  DEFAULT_AUTO_EXTEND,
  DEFAULT_VENUE_RULES,
  effectiveMaxAdvance,
  generateRecurringSlots,
  hhmmToDate,
  MAX_ADVANCE_DAYS_CAP,
  parseHHMM,
  readVenueSettings,
  recurringErrorMessage,
  timeToHHMM,
  weekdayLabels,
} from './recurring';
export type {
  GeneratedSlot,
  GenerateResult,
  PreviewSummary,
  RecurringConfig,
  RecurringErrorCode,
  SpaceBucket,
  SpacePrice,
  TimeRange,
  VenueAutoExtendForm,
  VenueOperatingHours,
  VenueRulesForm,
  VenueSettingsLike,
  VenueSettingsView,
  WeekdayLabelRow,
  WeekdayLabels,
} from './recurring';
