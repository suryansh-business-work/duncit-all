import type { MockedResponse } from '@apollo/client/testing';
import type { AiPrompt } from '@duncit/gql-types';
import type { TableQueryState } from '@duncit/table';
import {
  AI_PROMPTS,
  CREATE_AI_PROMPT,
  DELETE_AI_PROMPT,
  UPDATE_AI_PROMPT,
} from '../../src/pages/prompt-library/queries';

/**
 * Prompt Library mocks. `makeAiPrompt` is typed against the generated
 * `@duncit/gql-types` `AiPrompt` shape (carrying `__typename: 'AiPrompt'`), so a
 * renamed/removed field breaks typecheck and every mocked response satisfies
 * `MockedProvider`'s default `addTypename` cache — no `addTypename={false}`
 * escape hatch, no Apollo "__typename" runtime error.
 */
export const makeAiPrompt = (over: Partial<AiPrompt> = {}): AiPrompt => ({
  __typename: 'AiPrompt',
  id: 'p1',
  name: 'Prompt',
  description: 'A prompt',
  content: 'content that is long enough',
  category: 'General',
  target_model: 'gpt-4o-mini',
  token_count: 10,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: null,
  updated_at: null,
  ...over,
});

/**
 * The `aiPrompts(filter)` list query. Reusable by default (`maxUsageCount`);
 * pass `{ once: true }` for the ordered empty→create→refetch sequence where a
 * second identical query must resolve to a different result.
 */
export const aiPromptsListMock = (
  prompts: AiPrompt[] = [],
  opts: { once?: boolean } = {},
): MockedResponse => ({
  request: { query: AI_PROMPTS },
  variableMatcher: () => true,
  result: { data: { aiPrompts: prompts } },
  ...(opts.once ? {} : { maxUsageCount: 20 }),
});

const CREATE_MESSAGE = 'Name already exists';

/** `createAiPrompt` — returns the new id, or a server error when `fail`. */
export const createPromptMock = (
  opts: { fail?: boolean; id?: string; message?: string } = {},
): MockedResponse => ({
  request: { query: CREATE_AI_PROMPT },
  variableMatcher: () => true,
  result: opts.fail
    ? { errors: [{ message: opts.message ?? CREATE_MESSAGE }] }
    : { data: { createAiPrompt: { __typename: 'AiPrompt', id: opts.id ?? 'new-1' } } },
  maxUsageCount: 20,
});

/** `updateAiPrompt` — echoes the edited id, or a server error when `fail`. */
export const updatePromptMock = (
  opts: { fail?: boolean; id?: string; message?: string } = {},
): MockedResponse => ({
  request: { query: UPDATE_AI_PROMPT },
  variableMatcher: () => true,
  result: opts.fail
    ? { errors: [{ message: opts.message ?? 'Update failed' }] }
    : { data: { updateAiPrompt: { __typename: 'AiPrompt', id: opts.id ?? 'p1' } } },
  maxUsageCount: 20,
});

/** `deleteAiPrompt` — a Boolean scalar (no `__typename`), or an error when `fail`. */
export const deletePromptMock = (
  id: string,
  opts: { fail?: boolean; message?: string } = {},
): MockedResponse => ({
  request: { query: DELETE_AI_PROMPT, variables: { id } },
  result: opts.fail
    ? { errors: [{ message: opts.message ?? 'Cannot delete this prompt' }] }
    : { data: { deleteAiPrompt: true } },
});

/** In-memory `TableQueryState` builder for the promptTableRows unit tests. */
export const makeTableQuery = (over: Partial<TableQueryState> = {}): TableQueryState => ({
  search: '',
  page: 1,
  pageSize: 25,
  sortBy: null,
  sortDir: 'asc',
  filters: [],
  ...over,
});
