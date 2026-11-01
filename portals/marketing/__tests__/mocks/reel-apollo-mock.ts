import type { DocumentNode } from 'graphql';
import { vi, type Mock } from 'vitest';
import type { MarketingRunDetail, MarketingRunStep } from '../../src/pages/activity-page/queries';
import type {
  ReelAnalytics,
  ReelAnalyticsPost,
  ReelAsset,
  ReelBrand,
  ReelCheck,
  ReelConcept,
  ReelMessage,
  ReelMusic,
  ReelOverlay,
  ReelPostRef,
  ReelProject,
  ReelProjectSummary,
  ReelRecommendation,
  ReelScene,
  ReelScript,
  ReelScriptScene,
  ReelSpec,
  ReelStockItem,
  ReelStockPage,
  ReelText,
  ReelVariant,
} from '../../src/pages/reels/types';

/**
 * Apollo's two hooks, answered from a table the test fills in.
 *
 * Reel Studio's screens are a dozen small hooks that each fire one document.
 * What needs proving is what each does with the answer — close the dialog, say
 * so, refetch — not Apollo's cache, and a `MockedProvider` response has to
 * restate every selected field with its `__typename` to be accepted at all.
 * Here a test names the document and hands back the data or the failure.
 *
 * Wire it in with:
 *   vi.mock('@apollo/client/react', async (io) => ({ ...(await io()), ...(await import('../mocks/reel-apollo-mock')).hooks }));
 */

interface QueryAnswer {
  data?: unknown;
  loading?: boolean;
  error?: Error;
  refetch?: Mock;
}

type Mutate = (options?: { variables?: Record<string, unknown> }) => Promise<unknown>;

const queries = new Map<DocumentNode, QueryAnswer>();
const mutations = new Map<DocumentNode, Mock<Mutate>>();
const busy = new Set<DocumentNode>();

/** The options each `useQuery` was last called with — its variables, and whether it was skipped. */
export const queryOptions = new Map<DocumentNode, { variables?: Record<string, unknown>; skip?: boolean } | undefined>();

/** Answer a query. Returns the `refetch` it will hand out, so a test can assert on it or make it fail. */
export function answerQuery(document: DocumentNode, answer: QueryAnswer = {}): Mock {
  const refetch = answer.refetch ?? vi.fn(async () => ({}));
  queries.set(document, { ...answer, refetch });
  return refetch;
}

/** The function a mutation hook hands out. Resolves with empty data unless given something else to do. */
export function mutationOf(document: DocumentNode): Mock<Mutate> {
  let mutate = mutations.get(document);
  if (!mutate) {
    mutate = vi.fn<Mutate>(async () => ({ data: {} }));
    mutations.set(document, mutate);
  }
  return mutate;
}

/** Mark a mutation as in flight, as its hook reports while the request is out. */
export function setMutationBusy(document: DocumentNode, isBusy: boolean): void {
  if (isBusy) busy.add(document);
  else busy.delete(document);
}

export function resetApollo(): void {
  queries.clear();
  mutations.clear();
  busy.clear();
  queryOptions.clear();
}

export const hooks = {
  useQuery: (document: DocumentNode, options?: { variables?: Record<string, unknown>; skip?: boolean; pollInterval?: number }) => {
    queryOptions.set(document, options);
    const answer = queries.get(document) ?? {};
    const refetch = answer.refetch ?? answerQuery(document, answer);
    if (options?.skip) return { data: undefined, loading: false, error: undefined, refetch };
    return { data: answer.data, loading: answer.loading ?? false, error: answer.error, refetch };
  },
  useMutation: (document: DocumentNode) => [mutationOf(document), { loading: busy.has(document) }],
};

/**
 * The reel as the server answers it, one factory per type, every object with
 * its `__typename` — the shape Apollo's cache and the generated types expect.
 * Each takes an override so a test states only what it is about.
 */

/** Stamps the server's `__typename` on a hand-written shape. */
const typed = <T>(typename: string, value: T): T => ({ __typename: typename, ...value });

export const reelAsset = (over: Partial<ReelAsset> = {}): ReelAsset =>
  typed('ReelAsset', {
    id: 'a1',
    kind: 'VIDEO',
    source: 'DRIVE',
    name: 'jam.mp4',
    mime_type: 'video/mp4',
    drive_file_id: 'drive-a1',
    url: 'https://server.duncit.com/reels/media/a1',
    thumbnail_url: 'https://server.duncit.com/reels/thumbnail/a1',
    duration_ms: 10_000,
    width: 1080,
    height: 1920,
    size_bytes: 2_500_000,
    licence: '',
    attribution: '',
    provider_id: '',
    ...over,
  } as ReelAsset);

export const reelText = (over: Partial<ReelText> = {}): ReelText =>
  typed('ReelText', {
    id: 't1',
    text: 'Jam night',
    position: 'BOTTOM',
    style: 'CAPTION',
    animation: 'NONE',
    start_ms: 0,
    duration_ms: 0,
    color: '#FFFFFF',
    background: '',
    ...over,
  } as ReelText);

export const reelOverlay = (over: Partial<ReelOverlay> = {}): ReelOverlay =>
  typed('ReelOverlay', { id: 'o1', asset_id: 'logo', corner: 'TOP_RIGHT', width_pct: 22, opacity: 0.8, start_ms: 0, duration_ms: 0, ...over } as ReelOverlay);

export const reelMusic = (over: Partial<ReelMusic> = {}): ReelMusic =>
  typed('ReelMusic', { asset_id: 'song', volume: 0.6, trim_start_ms: 0, ...over } as ReelMusic);

export const reelScene = (over: Partial<ReelScene> = {}): ReelScene =>
  typed('ReelScene', {
    id: 's1',
    asset_id: 'a1',
    duration_ms: 2000,
    trim_start_ms: 0,
    volume: 1,
    playback_rate: 1,
    fit: 'COVER',
    motion: 'NONE',
    transition: 'NONE',
    transition_ms: 0,
    background: '#000000',
    texts: [],
    overlays: [],
    ...over,
  } as ReelScene);

export const reelBrand = (over: Partial<ReelBrand> = {}): ReelBrand =>
  typed('ReelBrand', { watermark_asset_id: '', watermark_corner: 'TOP_RIGHT', watermark_width_pct: 18, primary_color: '', ...over });

export const reelSpec = (over: Partial<ReelSpec> = {}): ReelSpec =>
  typed('ReelSpec', {
    fps: 30,
    width: 1080,
    height: 1920,
    aspect: 'PORTRAIT',
    background: '#000000',
    music: null,
    voiceover: null,
    brand: reelBrand(),
    captions: typed('ReelCaptions', { style: 'PLAIN' as const }),
    scenes: [],
    ...over,
  } as ReelSpec);

export const reelMessage = (over: Partial<ReelMessage> = {}): ReelMessage =>
  typed('ReelMessage', {
    id: 'm1',
    role: 'USER',
    text: 'open on the drums',
    asset_ids: [],
    restorable: false,
    failed: false,
    at: '2026-10-01T12:00:00.000Z',
    ...over,
  } as ReelMessage);

export const reelCheck = (over: Partial<ReelCheck> = {}): ReelCheck =>
  typed('ReelCheck', { name: 'length', pass: true, detail: 'Under 90 seconds', ...over });

export const reelVariant = (over: Partial<ReelVariant> = {}): ReelVariant =>
  typed('ReelVariant', { platform: 'INSTAGRAM', caption: 'Sundays at HSR', hashtags: ['pickleball', 'hsr'], title: 'Sunday jam', ...over });

export const reelPostRef = (over: Partial<ReelPostRef> = {}): ReelPostRef =>
  typed('ReelPostLink', { post_id: 'post-1', platform: 'INSTAGRAM', permalink: 'https://www.instagram.com/reel/abc', published_at: '2026-10-02T10:00:00.000Z', ...over });

export const reelProject = (over: Partial<ReelProject> = {}): ReelProject =>
  typed('ReelProject', {
    id: 'DUN-REEL-1',
    name: 'Jam night recap',
    drive_url: '',
    drive_folder_id: '',
    duration_ms: 0,
    cover_at_ms: null,
    created_by: 'reels@duncit.com',
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    assets: [],
    messages: [],
    spec: reelSpec(),
    variants: [],
    checks: [],
    posts: [],
    ...over,
  } as ReelProject);

export const reelSummary = (over: Partial<ReelProjectSummary> = {}): ReelProjectSummary =>
  typed('ReelProjectSummary', {
    id: 'DUN-REEL-1',
    name: 'Jam night recap',
    drive_url: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp',
    asset_count: 4,
    scene_count: 3,
    duration_ms: 84_000,
    cover_url: '',
    last_check_pass: null,
    posts_count: 0,
    views: 0,
    created_by: 'reels@duncit.com',
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    ...over,
  } as ReelProjectSummary);

export const reelStockItem = (over: Partial<ReelStockItem> = {}): ReelStockItem =>
  typed('ReelMediaItem', {
    id: 'px-1',
    kind: 'VIDEO',
    url: 'https://videos.pexels.com/video-files/1/1.mp4',
    preview_url: 'https://images.pexels.com/videos/1/preview.jpg',
    width: 1080,
    height: 1920,
    duration_ms: 12_000,
    licence: 'Pexels Licence',
    attribution: 'Ana Ruiz',
    provider_id: 'pexels:1',
    ...over,
  });

export const reelStockPage = (items: ReelStockItem[], has_more = false): ReelStockPage => typed('ReelMediaPage', { items, has_more });

export const reelConcept = (over: Partial<ReelConcept> = {}): ReelConcept =>
  typed('ReelConcept', { id: 'c1', title: 'First serve', hook: 'You have never seen HSR like this', angle: 'Beginners welcome', why: 'Curiosity', ...over });

export const reelScriptScene = (over: Partial<ReelScriptScene> = {}): ReelScriptScene =>
  typed('ReelScriptScene', { text: 'Sundays start here', shot: 'Court at sunrise', duration_ms: 3000, asset_query: 'pickleball sunrise', ...over });

export const reelScript = (over: Partial<ReelScript & { run_id: string }> = {}): ReelScript & { run_id: string } =>
  typed('ReelScript', { run_id: 'run-2', hooks: ['Stop scrolling', 'Sundays at HSR'], scenes: [reelScriptScene()], cta: 'Book your spot', ...over });

export const reelRecommendation = (over: Partial<ReelRecommendation> = {}): ReelRecommendation =>
  typed('ReelRecommendation', { title: 'Behind the scenes', why: 'Your audience replies to people', evidence: 'Comments on the last reel', ...over });

export const reelAnalyticsPost = (over: Partial<ReelAnalyticsPost> = {}): ReelAnalyticsPost =>
  typed('ReelAnalyticsPost', {
    platform: 'INSTAGRAM',
    permalink: 'https://www.instagram.com/reel/abc',
    published_at: '2026-10-02T10:00:00.000Z',
    views: 1200,
    likes: 80,
    comments: 12,
    shares: 5,
    engagement: 97,
    ...over,
  });

export const reelAnalytics = (over: Partial<ReelAnalytics> = {}): ReelAnalytics =>
  typed('ReelAnalytics', { posts: [reelAnalyticsPost()], views: 1200, likes: 80, comments: 12, shares: 5, engagement: 97, ...over });

export const runStep = (over: Partial<MarketingRunStep> = {}): MarketingRunStep =>
  typed('MarketingRunStep', {
    key: 'ideas',
    label: 'Find ideas',
    status: 'RUNNING',
    tool: '',
    input_summary: '',
    output_summary: '',
    error: '',
    started_at: '2026-10-01T12:00:00.000Z',
    finished_at: null,
    ms: 0,
    ...over,
  });

export const marketingRun = (over: Partial<MarketingRunDetail> = {}): MarketingRunDetail =>
  typed('MarketingRun', {
    id: 'run-1',
    workflow: 'REEL',
    name: 'Reel ideas',
    trigger: 'USER',
    status: 'RUNNING',
    actor: typed('MarketingRunActor', { kind: 'USER' as const, id: 'u1', name: 'Asha', email: 'asha@duncit.com' }),
    started_at: '2026-10-01T12:00:00.000Z',
    finished_at: null,
    created_at: '2026-10-01T12:00:00.000Z',
    retries: 0,
    error: '',
    parent_run_id: '',
    cancel_requested: false,
    can_retry: false,
    approval: typed('MarketingRunApproval', { required: false, requested_at: null, decision: null, decided_by: '', decided_by_name: '', decided_at: null, note: '' }),
    cost: typed('MarketingRunCost', { tokens_in: 0, tokens_out: 0, amount: 0, currency: 'INR' }),
    steps: [runStep()],
    api_log: [],
    ...over,
  });
