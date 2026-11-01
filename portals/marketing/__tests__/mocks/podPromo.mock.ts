import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  CANCEL_POD_PROMO,
  CREATE_POD_PROMO,
  POD_PROMO,
  POD_PROMO_CANDIDATES,
  POD_PROMO_OPTIONS,
  POD_PROMO_SETTINGS,
  POD_PROMO_SUMMARY,
  PREVIEW_POD_PROMO,
  REGENERATE_POD_PROMO_BANNER,
  SCHEDULE_POD_PROMO,
  UPDATE_POD_PROMO_SETTINGS,
  type PodBannerSlide,
  type PodBannerSlideKind,
  type PodBannerStyle,
  type PodPromo,
  type PodPromoBannerStyle,
  type PodPromoCandidate,
  type PodPromoFigures,
  type PodPromoPreview,
  type PodPromoSettings,
  type PodPromoSettingsInput,
  type PodPromoSummary,
} from '../../src/pages/pod-promos-page/queries';
import { GENERATE_POD_BANNERS, REGENERATE_POD_BANNER_SLIDE, type PodBannerSet } from '../../src/pages/pod-promos-page/banner.queries';

type Typed<T> = T & { __typename: string };

/** One rendered slide, as the server returns it. */
export const makeBannerSlide = (kind: PodBannerSlideKind, url = `https://ik.imagekit.io/duncit/marketing/pod_promos/${kind.toLowerCase()}.jpg`): Typed<PodBannerSlide> => ({
  __typename: 'PodBannerSlide',
  kind,
  url,
});

/** A full carousel: cover, details, host, venue and book. */
export const makeBannerSlides = (): Typed<PodBannerSlide>[] => (['COVER', 'DETAILS', 'HOST', 'VENUE', 'BOOK'] as const).map((kind) => makeBannerSlide(kind));

export const makePodPromoSettings = (over: Partial<PodPromoSettings> = {}): Typed<PodPromoSettings> => ({
  __typename: 'PodPromoSettings',
  enabled: true,
  days_before: 3,
  post_hour: 18,
  account_ids: ['acc1'],
  needs_approval: true,
  city_ids: [],
  club_ids: [],
  category_ids: [],
  price_filter: 'ALL',
  min_days_until_start: 1,
  banner_style: 'PORTRAIT',
  cta_text: '',
  utm_prefix: 'pod-promo',
  time_zone: 'Asia/Kolkata',
  updated_by_name: 'Asha Rao',
  updated_at: '2026-11-01T09:00:00.000Z',
  ...over,
});

export const makePodPromoFigures = (over: Partial<PodPromoFigures> = {}): Typed<PodPromoFigures> => ({
  __typename: 'PodPromoFigures',
  clicks: 120,
  unique_visitors: 90,
  signups: 30,
  pod_views: 80,
  checkouts: 20,
  bookings: 12,
  paid_bookings: 9,
  payments: 9,
  revenue: 4491,
  likes: 55,
  comments: 7,
  engagement: 62,
  updated_at: '2026-11-01T09:00:00.000Z',
  ...over,
});

export const makePodPromo = (over: Partial<PodPromo> = {}): Typed<PodPromo> => ({
  __typename: 'PodPromo',
  id: 'pp1',
  pod_id: 'pod1',
  pod_title: 'Sunset Run',
  pod_start: '2026-11-05T12:30:00.000Z',
  club_name: 'Pune Runners',
  city_name: 'Pune',
  pod_url: 'https://mweb.duncit.com/club/pune-runners/pod/sunset-run',
  status: 'SCHEDULED',
  source: 'AUTO',
  banner_url: 'https://ik.imagekit.io/duncit/marketing/pod_promos/pp1.jpg',
  style: 'SPORT_NIGHT',
  slides: makeBannerSlides(),
  collaborators: ['blue.cafe', 'asha_runs'],
  caption: 'Run into the sunset with us.',
  hashtags: ['DuncitPune', '#running'],
  ai_caption: true,
  tracking_url: 'https://duncit.com/aB3xY9Zq',
  scheduled_post_id: 'post1',
  post_status: 'PENDING_APPROVAL',
  permalink: '',
  scheduled_at: '2026-11-02T12:30:00.000Z',
  error: '',
  figures: makePodPromoFigures(),
  ...over,
});

export const makePodPromoSummary = (over: Partial<PodPromoSummary> = {}): Typed<PodPromoSummary> => ({
  __typename: 'PodPromoSummary',
  planned: 2,
  scheduled: 5,
  published: 11,
  failed: 1,
  clicks: 1500,
  bookings: 64,
  payments: 50,
  revenue: 24990,
  ...over,
});

export const makePodPromoCandidate = (over: Partial<PodPromoCandidate> = {}): Typed<PodPromoCandidate> => ({
  __typename: 'PodPromoCandidate',
  id: 'pod1',
  title: 'Sunset Run',
  starts_at: '2026-11-05T12:30:00.000Z',
  club_name: 'Pune Runners',
  promo_status: null,
  ...over,
});

export const makePodPromoPreview = (over: Partial<PodPromoPreview> = {}): Typed<PodPromoPreview> => ({
  __typename: 'PodPromoPreview',
  pod_id: 'pod1',
  pod_title: 'Sunset Run',
  banner_url: 'https://ik.imagekit.io/duncit/marketing/pod_promos/preview.jpg',
  banner_style: 'PORTRAIT',
  style: 'CALM_WELLNESS',
  slides: [makeBannerSlide('COVER'), makeBannerSlide('BOOK')],
  collaborators: ['blue.cafe'],
  caption: 'Run into the sunset with us.',
  hashtags: ['DuncitPune'],
  ai_caption: false,
  scheduled_at: '2026-11-02T12:30:00.000Z',
  ineligible_reason: '',
  ...over,
});

const fail = (message: string) => ({ errors: [new GraphQLError(message)] });

export const podPromoSettingsMock = (settings: PodPromoSettings | null = makePodPromoSettings(), error?: string): MockedResponse => ({
  request: { query: POD_PROMO_SETTINGS },
  result: error ? fail(error) : { data: { podPromoSettings: settings } },
});

export const podPromoOptionsMock = (error?: string): MockedResponse => ({
  request: { query: POD_PROMO_OPTIONS },
  result: error
    ? fail(error)
    : {
        data: {
          socialAccounts: [
            { __typename: 'SocialAccount', id: 'acc2', name: 'Duncit Pages', platform: 'FACEBOOK' },
            { __typename: 'SocialAccount', id: 'acc1', name: 'Duncit', platform: 'INSTAGRAM' },
          ],
          locations: [{ __typename: 'Location', id: 'loc1', location_name: 'Pune' }],
          clubs: [{ __typename: 'Club', id: 'club1', club_name: 'Pune Runners' }],
          categories: [{ __typename: 'Category', id: 'cat1', name: 'Fitness' }],
        },
      },
});

export const updatePodPromoSettingsMock = (input: PodPromoSettingsInput, error?: string): MockedResponse => ({
  request: { query: UPDATE_POD_PROMO_SETTINGS, variables: { input } },
  result: error ? fail(error) : { data: { updatePodPromoSettings: makePodPromoSettings(input) } },
});

export const podPromoSummaryMock = (summary: PodPromoSummary = makePodPromoSummary(), error?: string): MockedResponse => ({
  request: { query: POD_PROMO_SUMMARY },
  result: error ? fail(error) : { data: { podPromoSummary: summary } },
});

export const podPromoMock = (promo: PodPromo = makePodPromo(), error?: string): MockedResponse => ({
  request: { query: POD_PROMO, variables: { id: promo.id } },
  result: error ? fail(error) : { data: { podPromo: promo } },
});

export const podPromoCandidatesMock = (candidates: PodPromoCandidate[], search: string | null = null, error?: string): MockedResponse => ({
  request: { query: POD_PROMO_CANDIDATES, variables: { search } },
  result: error ? fail(error) : { data: { podPromoCandidates: candidates } },
});

export const previewPodPromoMock = (podId: string, preview: PodPromoPreview = makePodPromoPreview(), error?: string): MockedResponse => ({
  request: { query: PREVIEW_POD_PROMO, variables: { pod_id: podId } },
  result: error ? fail(error) : { data: { previewPodPromo: preview } },
});

export const createPodPromoMock = (podId: string, error?: string): MockedResponse => ({
  request: { query: CREATE_POD_PROMO, variables: { pod_id: podId } },
  result: error ? fail(error) : { data: { createPodPromo: makePodPromo({ pod_id: podId, source: 'MANUAL' }) } },
});

export const regeneratePodPromoBannerMock = (id: string, error?: string, style: PodBannerStyle | null = null): MockedResponse => ({
  request: { query: REGENERATE_POD_PROMO_BANNER, variables: { id, style } },
  result: error ? fail(error) : { data: { regeneratePodPromoBanner: makePodPromo({ id }) } },
});

export const cancelPodPromoMock = (id: string, error?: string): MockedResponse => ({
  request: { query: CANCEL_POD_PROMO, variables: { id } },
  result: error ? fail(error) : { data: { cancelPodPromo: makePodPromo({ id, status: 'CANCELLED' }) } },
});

export const makeBannerSet = (over: Partial<PodBannerSet> = {}): Typed<PodBannerSet> => ({
  __typename: 'PodBannerSet',
  pod_id: 'pod1',
  style: 'SPORT_NIGHT',
  size: 'PORTRAIT',
  slides: makeBannerSlides(),
  ai_copy: true,
  run_id: 'run42',
  ...over,
});

export const generatePodBannersMock = (
  podId: string,
  options: { style?: PodBannerStyle | null; size?: PodPromoBannerStyle | null; set?: PodBannerSet; error?: string } = {},
): MockedResponse => ({
  request: { query: GENERATE_POD_BANNERS, variables: { pod_id: podId, style: options.style ?? null, size: options.size ?? null } },
  result: options.error ? fail(options.error) : { data: { generatePodBanners: options.set ?? makeBannerSet({ pod_id: podId }) } },
});

export const regeneratePodBannerSlideMock = (
  podId: string,
  kind: PodBannerSlideKind,
  options: { style?: PodBannerStyle | null; size?: PodPromoBannerStyle | null; url?: string; error?: string } = {},
): MockedResponse => ({
  request: { query: REGENERATE_POD_BANNER_SLIDE, variables: { pod_id: podId, kind, style: options.style ?? null, size: options.size ?? null } },
  result: options.error ? fail(options.error) : { data: { regeneratePodBannerSlide: makeBannerSlide(kind, options.url) } },
});

export interface SchedulePodPromoVariables {
  pod_id: string;
  at: string | null;
  account_ids: string[] | null;
  collaborators: string[] | null;
  style: PodBannerStyle | null;
}

export const schedulePodPromoMock = (variables: SchedulePodPromoVariables, error?: string): MockedResponse => ({
  request: { query: SCHEDULE_POD_PROMO, variables },
  result: error ? fail(error) : { data: { schedulePodPromo: makePodPromo({ pod_id: variables.pod_id, source: 'MANUAL' }) } },
});
