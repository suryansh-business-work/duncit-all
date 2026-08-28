/**
 * A request that rejects with something other than an Error still needs a
 * readable message — this is the one branch a real Apollo mock cannot reach,
 * since ApolloError always wraps a rejection as an Error instance.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useQuery: () => ({
    data: {
      myPortalAccess: [
        {
          __typename: 'PortalAccessEntry',
          key: 'legal',
          name: 'Legal',
          url: 'https://legal.duncit.com/',
          has_access: false,
          can_request: true,
          request_status: null,
        },
      ],
    },
    loading: false,
    refetch: vi.fn(),
  }),
  useMutation: () => [vi.fn().mockRejectedValue('offline'), { loading: false }],
}));

import { JumpToPortalDialog } from '../src/chrome/jump-to-portal/JumpToPortalDialog';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

describe('JumpToPortalDialog request failure with a non-Error rejection', () => {
  it('falls back to a generic message rather than crashing', async () => {
    render(<JumpToPortalDialog open onClose={vi.fn()} />);
    await settle();

    fireEvent.click(screen.getByText("Portals you don't have access to"));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    await settle();
    await settle();

    expect(screen.getByText('Could not send the request. Please try again.')).toBeInTheDocument();
  });
});
