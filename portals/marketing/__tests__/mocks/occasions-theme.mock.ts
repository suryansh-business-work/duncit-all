import type {
  OccasionFlyer,
  OccasionParticleLayer,
  OccasionTheme,
  OccasionVectorLayer,
  ThemeModeTokens,
} from '@duncit/gql-types';

/**
 * Occasion looks as the server returns them, for the look editor's specs. Every
 * token is blank (the app's own) unless a spec sets it.
 */
export function makePalette(overrides: Partial<Omit<ThemeModeTokens, '__typename'>> = {}): ThemeModeTokens {
  return {
    __typename: 'ThemeModeTokens',
    primary: '',
    primaryHover: '',
    primaryActive: '',
    onPrimary: '',
    accent: '',
    onAccent: '',
    brand: '',
    bg: '',
    surface: '',
    soft: '',
    ink: '',
    muted: '',
    border: '',
    inputBorder: '',
    success: '',
    warning: '',
    error: '',
    info: '',
    onSemantic: '',
    ...overrides,
  };
}

export function makeParticleLayer(overrides: Partial<OccasionParticleLayer> = {}): OccasionParticleLayer {
  return {
    __typename: 'OccasionParticleLayer',
    shapes: ['SNOWFLAKE'],
    custom_paths: [],
    colors: ['#FFFFFF'],
    motion: 'FALL',
    count: 40,
    size_min: 6,
    size_max: 14,
    speed: 40,
    opacity: 0.9,
    ...overrides,
  };
}

export function makeVectorLayer(overrides: Partial<OccasionVectorLayer> = {}): OccasionVectorLayer {
  return { __typename: 'OccasionVectorLayer', path: 'M0 0L10 10', fill: '#FF0000', stroke: '', stroke_width: 2, x: 0, y: 0, ...overrides };
}

export function makeFlyer(overrides: Partial<OccasionFlyer> = {}): OccasionFlyer {
  return {
    __typename: 'OccasionFlyer',
    artwork: 'SANTA_SLEIGH',
    custom_layers: [],
    image_url: '',
    direction: 'LTR',
    altitude_min: 10,
    altitude_max: 25,
    size: 160,
    duration: 12,
    interval: 30,
    bob: 8,
    trail_color: '',
    ...overrides,
  };
}

export function makeOccasionTheme(overrides: Partial<OccasionTheme> = {}): OccasionTheme {
  return {
    __typename: 'OccasionTheme',
    key: 'christmas',
    name: 'Christmas',
    description: 'Snow and a sleigh.',
    region: 'WESTERN',
    color_mode: 'AUTO',
    greeting: 'Merry Christmas',
    palette_light: makePalette({ brand: '#8E1B3A', primary: '#000000', onPrimary: '#FFFFFF', accent: '#777777', onAccent: '#888888' }),
    palette_dark: makePalette(),
    particles: [makeParticleLayer()],
    flyers: [makeFlyer()],
    fireworks: { __typename: 'OccasionFireworks', enabled: false, colors: [], bursts_per_minute: 12, sparks: 28, radius: 90 },
    overlays: [],
    garland: { __typename: 'OccasionGarland', style: 'NONE', colors: [] },
    is_archived: false,
    is_builtin: false,
    schedule_enabled: false,
    sort_order: 0,
    starts_at: null,
    ends_at: null,
    updated_at: null,
    ...overrides,
  };
}
