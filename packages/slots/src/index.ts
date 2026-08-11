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
