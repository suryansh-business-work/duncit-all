import type { OccasionColorMode, OccasionLiveMode, OccasionLiveSource, OccasionRegion } from '@duncit/gql-types';

/**
 * The enums the Occasions page renders, each mapped to its Localization key.
 * The keys are written out in full — never assembled from the enum — so the
 * translation gate can see that every one is used.
 */

/** Catalogue order: the gallery groups looks in this order. */
export const REGIONS = ['INDIAN', 'NATIONAL', 'WESTERN', 'GLOBAL', 'CUSTOM'] as const satisfies readonly OccasionRegion[];

export const REGION_LABEL: Record<OccasionRegion, string> = {
  INDIAN: 'marketing.occasions.regions.indian',
  NATIONAL: 'marketing.occasions.regions.national',
  WESTERN: 'marketing.occasions.regions.western',
  GLOBAL: 'marketing.occasions.regions.global',
  CUSTOM: 'marketing.occasions.regions.custom',
};

export const COLOR_MODES = ['AUTO', 'LIGHT', 'DARK'] as const satisfies readonly OccasionColorMode[];

export const COLOR_MODE_LABEL: Record<OccasionColorMode, string> = {
  AUTO: 'marketing.occasions.colorModes.auto',
  LIGHT: 'marketing.occasions.colorModes.light',
  DARK: 'marketing.occasions.colorModes.dark',
};

export const LIVE_MODES = ['NORMAL', 'MANUAL', 'SCHEDULE'] as const satisfies readonly OccasionLiveMode[];

export const LIVE_MODE_LABEL: Record<OccasionLiveMode, string> = {
  NORMAL: 'marketing.occasions.liveModes.normal',
  MANUAL: 'marketing.occasions.liveModes.manual',
  SCHEDULE: 'marketing.occasions.liveModes.schedule',
};

export const LIVE_MODE_HINT: Record<OccasionLiveMode, string> = {
  NORMAL: 'marketing.occasions.liveModes.normalHint',
  MANUAL: 'marketing.occasions.liveModes.manualHint',
  SCHEDULE: 'marketing.occasions.liveModes.scheduleHint',
};

export const LIVE_SOURCE_LABEL: Record<OccasionLiveSource, string> = {
  MANUAL: 'marketing.occasions.sources.manual',
  SCHEDULE: 'marketing.occasions.sources.schedule',
  PREVIEW: 'marketing.occasions.sources.preview',
  NONE: 'marketing.occasions.sources.none',
};

export const LIVE_SOURCE_COLOR: Record<OccasionLiveSource, 'primary' | 'info' | 'warning' | 'default'> = {
  MANUAL: 'primary',
  SCHEDULE: 'info',
  PREVIEW: 'warning',
  NONE: 'default',
};
