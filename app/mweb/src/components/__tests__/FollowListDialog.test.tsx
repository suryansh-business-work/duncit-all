import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FollowListDialog, { FOLLOW_LISTS } from '../FollowListDialog';

const person = (id: string, following = false) => ({
  __typename: 'PublicProfile',
  user_id: id,
  username: `${id}1`,
  full_name: `User ${id}`,
  first_name: 'User',
  profile_photo: null,
  is_following: following,
});

const mocks = [
  {
    request: { query: FOLLOW_LISTS, variables: { userId: 'target' } },
    result: {
      data: {
        followersOf: [person('a'), person('me', false)],
        followingOf: [person('b', true)],
      },
    },
  },
];

function setup() {
  return render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <FollowListDialog
          open
          onClose={vi.fn()}
          userId="target"
          initialTab="followers"
          viewerId="me"
        />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('FollowListDialog (bug 9)', () => {
  it('lists followers with @handles and switches to the following tab', async () => {
    setup();
    expect(await screen.findByText('User a')).toBeInTheDocument();
    expect(screen.getByText('@a1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Following' }));
    await waitFor(() => expect(screen.getByText('User b')).toBeInTheDocument());
  });
});
