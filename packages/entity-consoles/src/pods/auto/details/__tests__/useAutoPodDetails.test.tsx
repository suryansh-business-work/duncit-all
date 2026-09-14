import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { makeDetailsRow } from '../../__tests__/fixtures';
import { ADMIN_AUTO_POD_DETAILS, AUTO_POD_AUDIENCE_COUNTS, type AutoPodDetailsRow } from '../../queries';
import { useAutoPodDetails } from '../useAutoPodDetails';

const request = { query: ADMIN_AUTO_POD_DETAILS, variables: { auto_pod_doc_id: 'ap-doc-1' } };

const response = (row: AutoPodDetailsRow) => ({
  data: {
    autoPod: {
      __typename: 'AutoPod',
      ...row,
      pod_images_and_videos: row.pod_images_and_videos.map((media) => ({ __typename: 'PodMedia', ...media })),
    },
  },
});

const renderDetails = (id: string, mocks: MockedResponse[]) =>
  renderHook(() => useAutoPodDetails(id), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        {children}
      </MockedProvider>
    ),
  });

describe('useAutoPodDetails', () => {
  it('reads the offer, then counts its category audience', async () => {
    const { result } = renderDetails('ap-doc-1', [
      { request, result: response(makeDetailsRow()) },
      {
        request: { query: AUTO_POD_AUDIENCE_COUNTS, variables: { sub_category_id: 'sub-badminton' } },
        result: {
          data: {
            autoPodAudience: { __typename: 'AutoPodAudience', venue_count: 6, host_count: 4, club_admin_count: 2 },
          },
        },
      },
    ]);
    expect(result.current).toMatchObject({ row: null, loading: true, counts: null });
    await waitFor(() => expect(result.current.counts).toEqual(expect.objectContaining({ host_count: 4 })));
    expect(result.current.row?.auto_pod_no).toBe('DUN-AP-4821');
    expect(result.current.loading).toBe(false);
  });

  it('counts nothing for an offer whose sub-category is not set', async () => {
    const { result } = renderDetails('ap-doc-1', [{ request, result: response(makeDetailsRow({ sub_category_id: '' })) }]);
    await waitFor(() => expect(result.current.row).not.toBeNull());
    expect(result.current.counts).toBeNull();
  });

  it('keeps the offer it has and surfaces the error when a refetch fails', async () => {
    const { result } = renderDetails('ap-doc-1', [
      { request, result: response(makeDetailsRow({ sub_category_id: '' })) },
      { request, result: { errors: [new GraphQLError('Auto Pod lookup failed')] } },
    ]);
    await waitFor(() => expect(result.current.row).not.toBeNull());
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.error?.message).toBe('Auto Pod lookup failed'));
    expect(result.current.row?.id).toBe('ap-doc-1');
  });
});
