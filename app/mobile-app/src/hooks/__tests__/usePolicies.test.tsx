import { renderHook, waitFor } from '@testing-library/react-native';

import { usePolicy, usePublicPolicies } from '@/hooks/usePolicies';
import { graphqlRequest } from '@/services/graphql.client';
import { usePolicyStore, usePublicPoliciesStore } from '@/stores/policies.store';

jest.mock('@/services/graphql.client');
const mockedRequest = jest.mocked(graphqlRequest);

beforeEach(() => {
  jest.clearAllMocks();
  usePublicPoliciesStore.setState({ data: undefined, isLoading: false, error: undefined });
  usePolicyStore.setState({ bySlug: {} });
});

describe('usePublicPolicies', () => {
  it('fetches the public policy links', async () => {
    mockedRequest.mockResolvedValue({
      publicPolicies: [{ id: '1', slug: 'terms', title: 'Terms' }],
    } as never);
    const { result } = renderHook(() => usePublicPolicies());
    await waitFor(() => expect(result.current.data?.publicPolicies).toHaveLength(1));
  });
});

describe('usePolicy', () => {
  it('fetches a policy by slug', async () => {
    mockedRequest.mockResolvedValue({ policyBySlug: { slug: 'terms', content: 'Hi' } } as never);
    const { result } = renderHook(() => usePolicy('terms'));
    await waitFor(() => expect(result.current.data?.policyBySlug?.content).toBe('Hi'));
  });

  it('stays idle without a slug', () => {
    const { result } = renderHook(() => usePolicy(''));
    expect(result.current.data).toBeUndefined();
    expect(mockedRequest).not.toHaveBeenCalled();
  });
});
