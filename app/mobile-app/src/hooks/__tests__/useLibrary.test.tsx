import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useFaqs } from '@/hooks/useLibrary';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('useFaqs', () => {
  it('loads groups, and captures errors', async () => {
    mockRequest.mockResolvedValueOnce({
      publicFaqGroups: [
        {
          super_category: { id: 's', name: 'General' },
          faqs: [{ id: 'f1', question: 'Q', answer: 'A' }],
        },
      ],
    });
    const ok = renderHook(() => useFaqs());
    await waitFor(() => expect(ok.result.current.isLoading).toBe(false));
    expect(ok.result.current.groups).toHaveLength(1);

    mockRequest.mockRejectedValueOnce(new Error('x'));
    const bad = renderHook(() => useFaqs());
    await waitFor(() => expect(bad.result.current.isLoading).toBe(false));
    expect(bad.result.current.error).toBeDefined();
  });
});
