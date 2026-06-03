import { renderHook, waitFor } from '@testing-library/react-native';

import { useSurveyData, useSurveyTree, type SurveyCategory } from '@/hooks/useSurvey';
import { graphqlRequest } from '@/services/graphql.client';
import { useSurveyStore } from '@/stores/survey.store';

jest.mock('@/services/graphql.client');
const mockedRequest = jest.mocked(graphqlRequest);

const TREE: SurveyCategory[] = [
  { id: 's1', name: 'For You', parent_id: null, is_active: true },
  { id: 'c1', name: 'Art', parent_id: 's1', is_active: true },
  { id: 'c2', name: 'Music', parent_id: 's1', is_active: true },
  { id: 'hidden', name: 'Old', parent_id: 's1', is_active: false },
];

beforeEach(() => {
  jest.clearAllMocks();
  useSurveyStore.setState({ data: undefined, isLoading: false, error: undefined, saving: false });
});

describe('useSurveyTree', () => {
  it('groups supers + children and counts selectable leaves (excludes inactive)', () => {
    const { result } = renderHook(() => useSurveyTree(TREE));
    expect(result.current.supers.map((s) => s.id)).toEqual(['s1']);
    expect(result.current.childrenByParent.get('s1')?.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.current.total).toBe(2);
    expect(result.current.superIds.has('s1')).toBe(true);
  });

  it('handles an undefined tree', () => {
    const { result } = renderHook(() => useSurveyTree(undefined));
    expect(result.current.supers).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});

describe('useSurveyData / survey store save', () => {
  it('fetches survey data with auth', async () => {
    mockedRequest.mockResolvedValue({
      me: { interest_category_ids: [] },
      categoryTree: TREE,
    } as never);
    const { result } = renderHook(() => useSurveyData());
    await waitFor(() => expect(result.current.data?.categoryTree).toHaveLength(4));
    expect(mockedRequest.mock.calls[0]?.[2]).toEqual({ auth: true });
  });

  it('saves interests with the chosen ids', async () => {
    mockedRequest.mockResolvedValue({ updateMyInterests: { user_id: 'u1' } } as never);
    await useSurveyStore.getState().save(['c1', 'c2', 'c3']);
    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({ category_ids: ['c1', 'c2', 'c3'] });
    expect(mockedRequest.mock.calls[0]?.[2]).toEqual({ auth: true });
  });
});
