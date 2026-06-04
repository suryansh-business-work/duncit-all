import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useFaqs, useMyPods } from '@/hooks/useLibrary';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

const pod = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  pod_id: `p-${id}`,
  pod_title: `Pod ${id}`,
  pod_date_time: '2026-06-12T00:00:00Z',
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  no_of_spots: 4,
  host_names: [],
  pod_attendees: [],
  pod_hosts_id: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  place_label: null,
  place_detail: null,
  ...over,
});

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

describe('useMyPods', () => {
  it('derives saved + history from the feed', async () => {
    mockRequest.mockResolvedValueOnce({
      me: { user_id: 'me', saved_pod_ids: ['1'] },
      pods: [pod('1'), pod('2', { pod_attendees: ['me'] }), pod('3', { pod_hosts_id: ['me'] })],
    });
    const { result } = renderHook(() => useMyPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.savedPods.map((p) => p.id)).toEqual(['1']);
    expect(result.current.historyPods.map((p) => p.id).sort()).toEqual(['2', '3']);
  });
});
