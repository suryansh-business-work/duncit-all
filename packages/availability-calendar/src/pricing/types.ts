import type {
  AppliedPriceRule,
  DayHours,
  PriceRule,
  PriceRuleMode,
  PriceRuleType,
  PricingSlot,
  VenueBookingCalendar,
  VenueBookingDay,
  VenueClosedReason,
  VenueDaySlot,
  VenuePriceBreakdown,
  VenuePricing,
  VenuePricingInput,
  VenuePricingModel,
} from '@duncit/gql-types';
import type { Translator } from '@duncit/app-settings';

export type { PriceRuleMode, PriceRuleType, VenueClosedReason, VenuePricingInput, VenuePricingModel };

/** The `t` a component receives from `useTranslation`. */
export type Translate = Translator['t'];

/** The generated types, without `__typename`, as the queries below select them. */
type Plain<T> = Omit<T, '__typename'>;

export type PricingRule = Plain<PriceRule>;
export type PricingSlotRow = Plain<PricingSlot>;
export type PricingHoursRow = Plain<DayHours>;

/** `venuePricing` exactly as PRICING_FIELDS selects it. */
export interface VenuePricingData extends Omit<Plain<VenuePricing>, 'slots' | 'operating_hours' | 'price_rules'> {
  slots: PricingSlotRow[];
  operating_hours: PricingHoursRow[];
  price_rules: PricingRule[];
}

/** `venuePriceQuote` / a frozen offer quote, as BREAKDOWN_FIELDS selects it. */
export interface PriceBreakdown extends Omit<Plain<VenuePriceBreakdown>, 'rules' | 'confirmed_at'> {
  rules: Plain<AppliedPriceRule>[];
}

export type BookingDaySlot = Plain<VenueDaySlot>;

export interface BookingDay extends Omit<Plain<VenueBookingDay>, 'busy' | 'slots'> {
  busy: { start: string; end: string }[];
  slots: BookingDaySlot[];
}

export interface BookingCalendarData extends Omit<Plain<VenueBookingCalendar>, 'days'> {
  days: BookingDay[];
}

/** The sample booking the live preview prices. */
export interface SampleBooking {
  /** 'yyyy-MM-dd' */
  date: string;
  /** 'HH:mm' */
  start: string;
  /** 'HH:mm' */
  end: string;
  pax: number;
  pets: boolean;
}

export const PRICING_MODELS: readonly VenuePricingModel[] = ['PER_PAX', 'PER_HOUR', 'PER_SLOT', 'FLAT'];
export const PRICE_RULE_TYPES: readonly PriceRuleType[] = ['WEEKDAY_SURCHARGE', 'DATE_OVERRIDE', 'DATE_RANGE'];
export const PRICE_RULE_MODES: readonly PriceRuleMode[] = ['PERCENT', 'FLAT'];
