import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import type { OccasionTheme, ThemeModeTokens } from '@duncit/gql-types';
import {
  ARCHIVE_OCCASION_THEME,
  DELETE_OCCASION_THEME,
  DUPLICATE_OCCASION_THEME,
  OCCASION_LIVE,
  OCCASION_THEME,
  OCCASION_THEMES,
  RESET_OCCASION_THEME,
  SAVE_OCCASION_THEME,
  SET_OCCASION_LIVE,
} from '../../src/pages/occasions-page/queries';

/** Every token blank: the look keeps the house colour for each, as the server sends an untouched mode. */
export const blankPalette = (overrides: Partial<ThemeModeTokens> = {}): ThemeModeTokens => ({
  __typename: 'ThemeModeTokens',
  bg: '',
  surface: '',
  soft: '',
  ink: '',
  muted: '',
  border: '',
  inputBorder: '',
  primary: '',
  primaryHover: '',
  primaryActive: '',
  onPrimary: '',
  accent: '',
  onAccent: '',
  brand: '',
  success: '',
  warning: '',
  error: '',
  info: '',
  onSemantic: '',
  ...overrides,
});

/** A look with no decoration at all, in the shape the gallery and editor queries read. */
export const makeLook = (overrides: Partial<OccasionTheme> = {}): OccasionTheme => ({
  __typename: 'OccasionTheme',
  key: 'diwali',
  name: 'Diwali',
  description: 'Lamps and gold',
  region: 'INDIAN',
  color_mode: 'AUTO',
  palette_light: blankPalette({ primary: '#8E1B3A', brand: '#FFD54F' }),
  palette_dark: blankPalette({ primary: '#FF8A65' }),
  particles: [],
  flyers: [],
  fireworks: { __typename: 'OccasionFireworks', enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { __typename: 'OccasionGarland', style: 'NONE', colors: [] },
  greeting: '',
  starts_at: null,
  ends_at: null,
  schedule_enabled: false,
  sort_order: 0,
  is_builtin: false,
  is_archived: false,
  updated_at: null,
  ...overrides,
});

const gqlError = (message: string) => ({ errors: [new GraphQLError(message)] });

export const occasionThemesMock = (themes: OccasionTheme[], uses = 1): MockedResponse => ({
  maxUsageCount: uses,
  request: { query: OCCASION_THEMES },
  result: { data: { occasionThemes: themes } },
});

export const occasionThemesErrorMock = (message: string): MockedResponse => ({
  request: { query: OCCASION_THEMES },
  result: gqlError(message),
});

export const occasionLiveMock = (theme: OccasionTheme | null, uses = 1): MockedResponse => ({
  maxUsageCount: uses,
  request: { query: OCCASION_LIVE },
  result: {
    data: {
      occasionLive: {
        __typename: 'OccasionLive',
        mode: theme ? 'MANUAL' : 'NORMAL',
        source: theme ? 'MANUAL' : 'NONE',
        next_change_at: null,
        theme,
      },
      occasionSettings: { __typename: 'OccasionSettings', mode: theme ? 'MANUAL' : 'NORMAL', manual_key: theme?.key ?? '', updated_at: null },
    },
  },
});

export const occasionThemeMock = (key: string, theme: OccasionTheme | null): MockedResponse => ({
  request: { query: OCCASION_THEME, variables: { key } },
  result: { data: { occasionTheme: theme } },
});

export const occasionThemeErrorMock = (key: string, message: string): MockedResponse => ({
  request: { query: OCCASION_THEME, variables: { key } },
  result: gqlError(message),
});

/** `input` is whatever the (stubbed) form mapping produced, so the spec states exactly what is sent. */
export const saveOccasionThemeMock = (key: string | null, input: Record<string, unknown>, saved: OccasionTheme): MockedResponse => ({
  request: { query: SAVE_OCCASION_THEME, variables: { key, input } },
  result: { data: { saveOccasionTheme: saved } },
});

export const saveOccasionThemeErrorMock = (key: string | null, input: Record<string, unknown>, message: string): MockedResponse => ({
  request: { query: SAVE_OCCASION_THEME, variables: { key, input } },
  result: gqlError(message),
});

const liveSettings = (mode: string, key: string) => ({
  data: { setOccasionLive: { __typename: 'OccasionSettings', mode, manual_key: key, updated_at: null } },
});

export const setOccasionLiveMock = (key: string): MockedResponse => ({
  request: { query: SET_OCCASION_LIVE, variables: { input: { mode: 'MANUAL', manual_key: key } } },
  result: liveSettings('MANUAL', key),
});

export const setOccasionLiveErrorMock = (key: string, message: string): MockedResponse => ({
  request: { query: SET_OCCASION_LIVE, variables: { input: { mode: 'MANUAL', manual_key: key } } },
  result: gqlError(message),
});

export const archiveOccasionThemeMock = (key: string, archived: boolean): MockedResponse => ({
  request: { query: ARCHIVE_OCCASION_THEME, variables: { key, archived } },
  result: { data: { archiveOccasionTheme: { __typename: 'OccasionTheme', key, is_archived: archived } } },
});

export const archiveOccasionThemeErrorMock = (key: string, archived: boolean, message: string): MockedResponse => ({
  request: { query: ARCHIVE_OCCASION_THEME, variables: { key, archived } },
  result: gqlError(message),
});

export const resetOccasionThemeMock = (key: string): MockedResponse => ({
  request: { query: RESET_OCCASION_THEME, variables: { key } },
  result: { data: { resetOccasionTheme: { __typename: 'OccasionTheme', key } } },
});

export const deleteOccasionThemeMock = (key: string): MockedResponse => ({
  request: { query: DELETE_OCCASION_THEME, variables: { key } },
  result: { data: { deleteOccasionTheme: true } },
});

export const duplicateOccasionThemeMock = (key: string, name: string, copyKey: string | null): MockedResponse => ({
  request: { query: DUPLICATE_OCCASION_THEME, variables: { key, name } },
  result: {
    data: { duplicateOccasionTheme: copyKey ? { __typename: 'OccasionTheme', key: copyKey, name } : null },
  },
});
