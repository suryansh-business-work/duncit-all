/**
 * @duncit/slots — one slot-selection experience for every surface.
 *
 * This entry point is framework-free, so React Native, the browser and Node can
 * all import it. The views live behind subpaths so a consumer never pulls in the
 * other platform's UI toolkit:
 *   - `@duncit/slots/mui`    — portals + mWeb (MUI + MUIX DateCalendar)
 *   - `@duncit/slots/native` — the app (Tamagui)
 */
export {
  groupSlotsByDay,
  resolveSlotDay,
  slotDayBounds,
  slotDayKeys,
  slotDayLabel,
  slotPriceLabel,
  slotRangeLabel,
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
