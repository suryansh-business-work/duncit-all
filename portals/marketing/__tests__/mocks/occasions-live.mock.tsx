import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import type {
  OccasionLive,
  OccasionLiveMode,
  OccasionScheduleInput,
  OccasionSettings,
  OccasionTheme,
  ThemeModeTokens,
} from '@duncit/gql-types';
import {
  OCCASION_LIVE,
  OCCASION_THEMES,
  SET_OCCASION_LIVE,
  SET_OCCASION_SCHEDULE,
} from '../../src/pages/occasions-page/queries';
import { OCCASION_ICONS, SAVE_OCCASION_ICONS, type OccasionIcon } from '../../src/pages/occasions-page/app-icons/queries';
import { SAVE_STORE_OCCASIONS, STORE_OCCASIONS, type StoreOccasionRow } from '../../src/pages/occasions-page/store/queries';

/**
 * Fixtures and field stand-ins for the Occasions page's Live, Schedule,
 * App icons and Ecomm store tabs. Every object the mocked server returns
 * carries its GraphQL `__typename`, as the real one does.
 */

/** Blank tokens keep the house colours; only brand and primary are set so a look reads as itself. */
const palette = (brand: string): ThemeModeTokens => ({
  __typename: 'ThemeModeTokens',
  bg: '',
  surface: '',
  soft: '',
  ink: '',
  muted: '',
  border: '',
  inputBorder: '',
  primary: '#8E1B3A',
  primaryHover: '',
  primaryActive: '',
  onPrimary: '',
  accent: '',
  onAccent: '',
  brand,
  success: '',
  warning: '',
  error: '',
  info: '',
  onSemantic: '',
});

export const makeLook = (over: Partial<OccasionTheme> = {}): OccasionTheme => ({
  __typename: 'OccasionTheme',
  key: 'diwali',
  name: 'Diwali',
  description: 'Lamps and marigolds.',
  region: 'INDIAN',
  color_mode: 'AUTO',
  palette_light: palette('#FFB300'),
  palette_dark: palette('#FFD54F'),
  particles: [],
  flyers: [],
  fireworks: { __typename: 'OccasionFireworks', enabled: false, colors: [], bursts_per_minute: 6, sparks: 40, radius: 120 },
  overlays: [],
  garland: { __typename: 'OccasionGarland', style: 'NONE', colors: [] },
  greeting: 'Happy Diwali!',
  starts_at: '2026-11-01T00:00:00.000Z',
  ends_at: '2026-11-05T00:00:00.000Z',
  schedule_enabled: true,
  sort_order: 10,
  is_builtin: true,
  is_archived: false,
  updated_at: null,
  ...over,
});

export const makeSettings = (over: Partial<OccasionSettings> = {}): OccasionSettings => ({
  __typename: 'OccasionSettings',
  mode: 'NORMAL',
  manual_key: '',
  updated_at: null,
  ...over,
});

export const makeLive = (over: Partial<OccasionLive> = {}): OccasionLive => ({
  __typename: 'OccasionLive',
  mode: 'NORMAL',
  source: 'NONE',
  next_change_at: null,
  theme: null,
  ...over,
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

export const occasionThemesMock = (looks: OccasionTheme[], uses = 1): MockedResponse => ({
  request: { query: OCCASION_THEMES },
  result: { data: { occasionThemes: looks } },
  maxUsageCount: uses,
});

export const occasionThemesErrorMock = (message: string): MockedResponse => ({ request: { query: OCCASION_THEMES }, ...rejection(message) });

export const occasionLiveMock = (live: OccasionLive, settings: OccasionSettings, uses = 1): MockedResponse => ({
  request: { query: OCCASION_LIVE },
  result: { data: { occasionLive: live, occasionSettings: settings } },
  maxUsageCount: uses,
});

export const occasionLiveErrorMock = (message: string): MockedResponse => ({ request: { query: OCCASION_LIVE }, ...rejection(message) });

export const setOccasionLiveMock = (mode: OccasionLiveMode, manualKey: string | null, saved: OccasionSettings): MockedResponse => ({
  request: { query: SET_OCCASION_LIVE, variables: { input: { mode, manual_key: manualKey } } },
  result: { data: { setOccasionLive: saved } },
});

export const setOccasionLiveErrorMock = (mode: OccasionLiveMode, manualKey: string | null, message: string): MockedResponse => ({
  request: { query: SET_OCCASION_LIVE, variables: { input: { mode, manual_key: manualKey } } },
  ...rejection(message),
});

export const setOccasionScheduleMock = (key: string, input: OccasionScheduleInput): MockedResponse => ({
  request: { query: SET_OCCASION_SCHEDULE, variables: { key, input } },
  result: { data: { setOccasionSchedule: { __typename: 'OccasionTheme', key, ...input } } },
});

export const setOccasionScheduleErrorMock = (key: string, input: OccasionScheduleInput, message: string): MockedResponse => ({
  request: { query: SET_OCCASION_SCHEDULE, variables: { key, input } },
  ...rejection(message),
});

export const makeIcon = (over: Partial<OccasionIcon> = {}): OccasionIcon => ({
  slug: 'diwali',
  label: 'Diwali icons',
  starts_at: '2026-11-01T00:00:00.000Z',
  ends_at: '2026-11-05T00:00:00.000Z',
  icon_url: 'https://cdn.example.com/diwali.png',
  fallback_icon: 'occasion',
  is_active: true,
  sort_order: 0,
  ...over,
});

const typedIcon = (icon: OccasionIcon) => ({ __typename: 'OccasionalIcon', ...icon });

export const occasionIconsMock = (icons: OccasionIcon[], uses = 1): MockedResponse => ({
  request: { query: OCCASION_ICONS },
  result: { data: { branding: { __typename: 'Branding', occasional_icons: icons.map(typedIcon) } } },
  maxUsageCount: uses,
});

export const occasionIconsErrorMock = (message: string): MockedResponse => ({ request: { query: OCCASION_ICONS }, ...rejection(message) });

export const saveOccasionIconsMock = (input: OccasionIcon[]): MockedResponse => ({
  request: { query: SAVE_OCCASION_ICONS, variables: { input } },
  result: { data: { updateOccasionalIcons: input.map(typedIcon) } },
});

export const saveOccasionIconsErrorMock = (input: OccasionIcon[], message: string): MockedResponse => ({
  request: { query: SAVE_OCCASION_ICONS, variables: { input } },
  ...rejection(message),
});

export const makeStoreOccasion = (over: Partial<StoreOccasionRow> = {}): StoreOccasionRow => ({
  slug: 'diwali',
  label: 'Diwali sale',
  theme: 'DIWALI',
  effects_enabled: true,
  greeting: 'Happy Diwali',
  starts_at: '2026-11-01T00:00:00.000Z',
  ends_at: '2026-11-05T00:00:00.000Z',
  logo_url: '/store/occasions/logo.png',
  favicon_url: '',
  background_url: 'https://cdn.example.com/bg.png',
  background_color: '#FFF4E5',
  announcement_text: 'Free delivery all week',
  is_active: true,
  sort_order: 0,
  ...over,
});

export const storeOccasionsMock = (rows: StoreOccasionRow[], uses = 1): MockedResponse => ({
  request: { query: STORE_OCCASIONS },
  result: { data: { storeOccasions: rows.map((row) => ({ __typename: 'StoreOccasion', ...row })) } },
  maxUsageCount: uses,
});

export const storeOccasionsErrorMock = (message: string): MockedResponse => ({ request: { query: STORE_OCCASIONS }, ...rejection(message) });

export const saveStoreOccasionsMock = (input: StoreOccasionRow[]): MockedResponse => ({
  request: { query: SAVE_STORE_OCCASIONS, variables: { input } },
  result: { data: { storeSaveOccasions: input.map(({ slug }) => ({ __typename: 'StoreOccasion', slug })) } },
});

export const saveStoreOccasionsErrorMock = (input: StoreOccasionRow[], message: string): MockedResponse => ({
  request: { query: SAVE_STORE_OCCASIONS, variables: { input } },
  ...rejection(message),
});

/**
 * `DateTimeField` wraps the MUI X picker, tested in components.test. This
 * stand-in keeps its contract — an ISO string in, an ISO string out — in a
 * plain input, and shows the helper text and error state it was handed.
 *
 *   vi.mock('../../src/components/DateTimeField', async () => ({
 *     default: (await import('../mocks/occasions-live.mock')).DateTimeFieldStub,
 *   }));
 */
export function DateTimeFieldStub({
  label,
  value,
  onChange,
  required,
  error,
  helperText,
}: Readonly<{ label: string; value: string; onChange: (iso: string) => void; required?: boolean; error?: boolean; helperText?: string }>) {
  return (
    <div data-testid={`datetime-${label}`}>
      <input aria-label={label} value={value} required={required} aria-invalid={error} onChange={(event) => onChange(event.target.value)} />
      <span data-testid={`datetime-help-${label}`}>{helperText}</span>
    </div>
  );
}

/** `MediaPickerField` belongs to @duncit/media-picker; this stand-in takes the URL as text. */
export function MediaPickerFieldStub({
  label,
  value,
  onChange,
  folder,
  helperText,
}: Readonly<{ label: string; value: string; onChange: (url: string) => void; folder?: string; helperText?: string }>) {
  return (
    <div data-testid={`media-${label}`} data-folder={folder}>
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      {helperText && <span>{helperText}</span>}
    </div>
  );
}
