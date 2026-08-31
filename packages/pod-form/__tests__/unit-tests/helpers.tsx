import type { ReactNode } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { PodFormDataProvider } from '../../src/context';
import { blankPodFormValues, type PodFormConfig, type PodFormData, type PodFormValues } from '../../src/types';

/** Config with every flag off — spread overrides on top per test. */
export const makeConfig = (over: Partial<PodFormConfig> = {}): PodFormConfig => ({
  showHosts: false,
  showLocationZone: false,
  showVenueSlot: false,
  showPlaceCharges: false,
  showInventory: false,
  showFinance: false,
  showIsActive: false,
  showProducts: false,
  showReel: false,
  ...over,
});

/** The slot-picker copy a portal passes in (`shell.slots.*`); English here so assertions read. */
export const SLOT_LABELS: PodFormData['slotLabels'] = {
  date: 'Date',
  hint: 'Pick a day with availability.',
  availableSlots: 'Available slots',
  free: 'Free',
  today: 'Today',
  tomorrow: 'Tomorrow',
  loading: 'Loading slots…',
  empty: 'No available slots for this venue.',
  emptyDay: 'No slots on this day.',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  pickVenueFirst: 'Pick a venue to see its available slots.',
  currentlyBooked: 'Currently booked for this pod',
  wholeVenue: 'Whole venue',
  wholeDay: 'Whole day',
};

const toDate = (input: unknown): Date => {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  return new Date(String(input ?? ''));
};

/** Fixed to UTC, standing in for the admin-configured `useDateFormat()`. */
export const DATE_FORMATTER: PodFormData['dateFormatter'] = {
  dayKey: (input) => {
    const date = toDate(input);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  },
  formatDate: (input) => toDate(input).toISOString().slice(0, 10),
  formatTime: (input) => toDate(input).toISOString().slice(11, 16),
  formatPattern: (input) => String(input.getUTCDate()),
  clock: { nowMs: () => Date.UTC(2030, 0, 1, 9, 0, 0) },
};

/** Default injected PodFormData — override slices per test. */
export const makeData = (over: Partial<PodFormData> = {}): PodFormData => ({
  config: makeConfig(),
  clubs: [],
  venues: [],
  users: [],
  products: [],
  getClubVenueIds: () => [],
  dateFormatter: DATE_FORMATTER,
  slotLabels: SLOT_LABELS,
  ...over,
});

export interface HarnessProps {
  data?: PodFormData;
  defaultValues?: Partial<PodFormValues>;
  methodsRef?: { current: UseFormReturn<PodFormValues> | null };
  children: ReactNode;
}

/** Wraps children in an RHF FormProvider + PodFormDataProvider for section/field tests. */
export function Harness({ data, defaultValues, methodsRef, children }: Readonly<HarnessProps>) {
  const methods = useForm<PodFormValues, any, PodFormValues>({
    defaultValues: { ...blankPodFormValues, ...defaultValues },
  });
  if (methodsRef) methodsRef.current = methods;
  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={data ?? makeData()}>{children}</PodFormDataProvider>
    </FormProvider>
  );
}
