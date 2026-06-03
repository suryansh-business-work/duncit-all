import { graphqlRequest } from '@/services/graphql.client';
import { usePolicyStore } from '@/stores/policies.store';
import { useSurveyStore } from '@/stores/survey.store';

jest.mock('@/services/graphql.client');
const mockedRequest = jest.mocked(graphqlRequest);

beforeEach(() => {
  jest.clearAllMocks();
  usePolicyStore.setState({ bySlug: {} });
  useSurveyStore.setState({ data: undefined, isLoading: false, error: undefined, saving: false });
});

describe('policies store', () => {
  it('ignores an empty slug and dedupes loaded slugs', async () => {
    await usePolicyStore.getState().fetch('');
    expect(mockedRequest).not.toHaveBeenCalled();

    usePolicyStore.setState({ bySlug: { terms: { data: {} as never, isLoading: false } } });
    await usePolicyStore.getState().fetch('terms');
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('captures a per-slug fetch error', async () => {
    mockedRequest.mockRejectedValue(new Error('boom'));
    await usePolicyStore.getState().fetch('privacy');
    expect(usePolicyStore.getState().bySlug.privacy?.error).toBeInstanceOf(Error);
    expect(usePolicyStore.getState().bySlug.privacy?.isLoading).toBe(false);
  });
});

describe('survey store', () => {
  it('captures a fetch error', async () => {
    mockedRequest.mockRejectedValue(new Error('down'));
    await useSurveyStore.getState().fetch();
    expect(useSurveyStore.getState().error).toBeInstanceOf(Error);
    expect(useSurveyStore.getState().isLoading).toBe(false);
  });

  it('clears the saving flag after a save', async () => {
    mockedRequest.mockResolvedValue({} as never);
    await useSurveyStore.getState().save(['c1']);
    expect(useSurveyStore.getState().saving).toBe(false);
  });
});
