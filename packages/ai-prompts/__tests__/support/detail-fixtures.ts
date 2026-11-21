/**
 * Fixtures for the detail view: a full `aiPromptDetail` answer built from a
 * row, and the mocked operations around it (the view count, the review, the
 * analytics, and the key lookup a link runs).
 */
import type { MockedResponse } from '@apollo/client/testing';
import { AI_PROMPTS } from '../../src/queries';
import { AI_PROMPT_ANALYTICS, AI_PROMPT_DETAIL, RECORD_AI_PROMPT_EVENT, SCORE_AI_PROMPT } from '../../src/detailQueries';
import type { PromptAnalytics, PromptDetail, PromptQuality } from '../../src/detailTypes';
import type { AiPrompt } from '../../src/types';

export const QUALITY: PromptQuality = {
  score: 86,
  summary: 'Clear task and output format.',
  strengths: ['Names its role'],
  improvements: ['Say what to do with an empty map'],
  model: 'gpt-4o-mini',
  scored_at: '2026-11-20T10:00:00.000Z',
  stale: false,
};

export const detailOf = (prompt: AiPrompt, over: Partial<PromptDetail> = {}): PromptDetail => ({
  prompt,
  archived_at: null,
  archived_by_name: null,
  quality: QUALITY,
  share: { enabled: false, token: null, shared_at: null, shared_by_name: null },
  total_hits: 3,
  last_hit_at: '2026-11-21T08:00:00.000Z',
  versions: [
    {
      version: 2,
      change: 'UPDATE',
      changed_fields: ['content'],
      name: prompt.name,
      description: prompt.description ?? '',
      content: prompt.content,
      category: prompt.category,
      target_model: prompt.target_model,
      is_active: true,
      token_count: prompt.token_count,
      edited_by_name: 'Asha Rao',
      created_at: '2026-11-21T07:00:00.000Z',
    },
    {
      version: 1,
      change: 'CREATE',
      changed_fields: [],
      name: prompt.name,
      description: prompt.description ?? '',
      content: 'The first draft.',
      category: prompt.category,
      target_model: prompt.target_model,
      is_active: true,
      token_count: 4,
      edited_by_name: null,
      created_at: '2026-11-01T07:00:00.000Z',
    },
  ],
  ...over,
});

export const detailMock = (detail: PromptDetail | null, id = detail?.prompt.id ?? 'missing'): MockedResponse => ({
  request: { query: AI_PROMPT_DETAIL, variables: { id } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { aiPromptDetail: detail } },
});

/** Every count the view may send for a prompt, answered as recorded. */
export const eventMocks = (id: string): MockedResponse[] =>
  ['DETAIL_VIEW', 'QUICK_VIEW', 'COPY_PROMPT', 'COPY_LINK'].map((type) => ({
    request: { query: RECORD_AI_PROMPT_EVENT, variables: { id, type, platform: null } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { recordAiPromptEvent: true } },
  }));

export const scoreMock = (id: string, force: boolean, answer: PromptQuality | Error): MockedResponse => ({
  request: { query: SCORE_AI_PROMPT, variables: { id, force } },
  ...(answer instanceof Error ? { error: answer } : { result: { data: { scoreAiPrompt: answer } } }),
});

export const EMPTY_ANALYTICS: PromptAnalytics = {
  range_days: 30,
  total_hits: 0,
  unique_visitors: 0,
  by_type: [],
  by_platform: [],
  by_source: [],
  by_device: [],
  by_day: [],
};

export const analyticsMock = (id: string, range: number, stats: PromptAnalytics | Error): MockedResponse => ({
  request: { query: AI_PROMPT_ANALYTICS, variables: { id, range_days: range } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  ...(stats instanceof Error ? { error: stats } : { result: { data: { aiPromptAnalytics: stats } } }),
});

/** The two reads a `?prompt=<key>` link runs: the live list, then the archive. */
export const searchMocks = (key: string, live: readonly AiPrompt[], archived: readonly AiPrompt[] = []): MockedResponse[] => [
  {
    request: { query: AI_PROMPTS, variables: { filter: { search: key } } },
    result: { data: { aiPrompts: live } },
  },
  {
    request: { query: AI_PROMPTS, variables: { filter: { search: key, archived: true } } },
    result: { data: { aiPrompts: archived } },
  },
];
