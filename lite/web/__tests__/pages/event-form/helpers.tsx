/**
 * What the event-form tests share: the real English translator, the
 * settings' limits, a complete valid set of form values, a FormProvider
 * harness that hands the test the live form, and stand-ins for the Google
 * Places objects the place search reads.
 */
import { useEffect, type ReactElement, type ReactNode } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MockedResponse } from '@apollo/client/testing';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import { createTranslator } from '@duncit/i18n';
import { vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../shared/i18n';
import { LITE_MY_CALENDARS } from '../../../graphql/calendars';
import { LITE_CATEGORIES, LITE_CITIES } from '../../../graphql/discover';
import type { loadPlaces, PickedPlace, PlaceSuggestion } from '../../../lib/googleMaps';
import { eventDefaults, limitsFrom, makeEventSchema, type EventFormValues } from '../../../pages/event-form/event.types';
import { calendarFixture, categoryFixture, cityFixture, renderWithProviders, settingsFixture, type RenderOptions } from '../../test-utils';

/** The web app's English copy, exactly as `useWebT()` answers without a provider. */
export const t = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK }).t;

/** The default settings' limits: capacity up to 5,000, a ticket up to ₹50,000. */
export const LIMITS = limitsFrom(settingsFixture());

/** A complete, valid form: a free, in-person event on 5 Dec 2026, 7:00–9:30 PM in Delhi. */
export const validValues = (over: Partial<EventFormValues> = {}): EventFormValues => ({
  ...eventDefaults(null, null, 'General admission'),
  title: 'Rooftop Jam',
  description: 'Live music on the roof.',
  start_at: new Date('2026-12-05T13:30:00.000Z'),
  end_at: new Date('2026-12-05T16:00:00.000Z'),
  timezone: 'Asia/Kolkata',
  venue_name: 'Skyline Terrace',
  ...over,
});

interface HarnessProps {
  defaults?: Partial<EventFormValues>;
  onForm: (form: UseFormReturn<EventFormValues>) => void;
  children: ReactNode;
}

/** The event form's provider, validated by the real schema, with date pickers available. */
function EventFormHarness({ defaults, onForm, children }: Readonly<HarnessProps>) {
  const form = useForm<EventFormValues>({ resolver: zodResolver(makeEventSchema(t, LIMITS)), defaultValues: validValues(defaults) });
  useEffect(() => {
    onForm(form);
  }, [form, onForm]);
  return (
    <DuncitLocalizationProvider timeZoneAware>
      <FormProvider {...form}>{children}</FormProvider>
    </DuncitLocalizationProvider>
  );
}

/** Render a part of the event form inside a live form; `form()` is that form. */
export function renderInEventForm(ui: ReactElement, options: RenderOptions & { defaults?: Partial<EventFormValues> } = {}) {
  const captured: { form: UseFormReturn<EventFormValues> | null } = { form: null };
  const keep = (form: UseFormReturn<EventFormValues>) => {
    captured.form = form;
  };
  const utils = renderWithProviders(
    <EventFormHarness defaults={options.defaults} onForm={keep}>
      {ui}
    </EventFormHarness>,
    options,
  );
  const form = (): UseFormReturn<EventFormValues> => {
    if (!captured.form) throw new Error('The event form has not mounted');
    return captured.form;
  };
  return { ...utils, form };
}

/** The form's three option lists: one city, one category, one of the host's calendars. */
export const eventOptionsMocks = (): MockedResponse[] => [
  { request: { query: LITE_CITIES }, result: { data: { liteCities: [cityFixture()] } }, maxUsageCount: Number.POSITIVE_INFINITY },
  { request: { query: LITE_CATEGORIES }, result: { data: { liteCategories: [categoryFixture()] } }, maxUsageCount: Number.POSITIVE_INFINITY },
  { request: { query: LITE_MY_CALENDARS }, result: { data: { liteMyCalendars: [calendarFixture()] } }, maxUsageCount: Number.POSITIVE_INFINITY },
];

// ------------------------------------------------------------ Google Places ----

export type PlacesLibrary = Awaited<ReturnType<typeof loadPlaces>>;

/** A Places library whose session tokens can be told apart. */
export function fakePlaces(): { lib: PlacesLibrary; Token: new () => { serial: number } } {
  let serial = 0;
  class Token {
    readonly serial: number;
    constructor() {
      serial += 1;
      this.serial = serial;
    }
  }
  const lib: PlacesLibrary = {
    AutocompleteSessionToken: Token,
    AutocompleteSuggestion: { fetchAutocompleteSuggestions: async () => ({ suggestions: [] }) },
  };
  return { lib, Token };
}

export const suggestionFixture = (over: Partial<PlaceSuggestion> = {}): PlaceSuggestion => ({
  placeId: 'place-1',
  main: 'Lodhi Garden',
  secondary: 'New Delhi, Delhi, India',
  toPlace: vi.fn(),
  ...over,
});

export const pickedFixture = (over: Partial<PickedPlace> = {}): PickedPlace => ({
  placeId: 'place-1',
  name: 'Lodhi Garden',
  address: 'Lodhi Road, New Delhi, Delhi 110003, India',
  lat: 28.5931,
  lng: 77.2197,
  city: 'New Delhi',
  ...over,
});

/** A Places load that failed, already marked handled so the test run does not report it as unhandled. */
export function failedLoad(): Promise<PlacesLibrary> {
  const failed = Promise.reject(new Error('Google Maps could not be loaded'));
  failed.catch(() => undefined);
  return failed;
}
