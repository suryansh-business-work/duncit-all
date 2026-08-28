import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import UserBadgesSection from '../UserBadgesSection';
import { renderWithProviders } from './testkit';

/**
 * The section keeps its query private, so the mock re-declares the exact
 * document it must send — a renamed field breaks the MockedProvider match.
 */
const USER_BADGES = gql`
  query AdminUserBadges($user_id: ID!) {
    userBadges(user_id: $user_id) {
      id
      awarded_at
      badge {
        id
        title
        description
        image_url
      }
    }
  }
`;

const USER_ID = 'u-badges-1';

const badgesMock = (userBadges: unknown[]): MockedResponse => ({
  request: { query: USER_BADGES, variables: { user_id: USER_ID } },
  result: { data: { userBadges } },
});

describe('UserBadgesSection — loading and empty', () => {
  it('renders nothing while the query is in flight', () => {
    renderWithProviders(<UserBadgesSection userId={USER_ID} />, { mocks: [badgesMock([])] });

    expect(screen.queryByText(/Badges/)).toBeNull();
  });

  it('shows the empty copy and a zero count once loaded with no badges', async () => {
    renderWithProviders(<UserBadgesSection userId={USER_ID} />, { mocks: [badgesMock([])] });

    await waitFor(() => expect(screen.getByText('Badges (0)')).toBeInTheDocument());
    expect(screen.getByText('No badges earned yet.')).toBeInTheDocument();
  });

  it('skips the query and renders the empty state immediately when there is no user id', () => {
    renderWithProviders(<UserBadgesSection userId="" />);

    expect(screen.getByText('Badges (0)')).toBeInTheDocument();
    expect(screen.getByText('No badges earned yet.')).toBeInTheDocument();
  });
});

describe('UserBadgesSection — with badges', () => {
  it('shows an avatar image for a badge that has one, and the icon fallback for one that does not', async () => {
    renderWithProviders(<UserBadgesSection userId={USER_ID} />, {
      mocks: [
        badgesMock([
          {
            __typename: 'UserBadge',
            id: 'ub-1',
            awarded_at: '2026-01-01T00:00:00.000Z',
            badge: {
              __typename: 'Badge',
              id: 'b-1',
              title: 'Early Bird',
              description: 'Joined 5 pods before 9am',
              image_url: 'https://cdn.test/early-bird.png',
            },
          },
          {
            __typename: 'UserBadge',
            id: 'ub-2',
            awarded_at: '2026-01-02T00:00:00.000Z',
            badge: {
              __typename: 'Badge',
              id: 'b-2',
              title: 'No Icon Badge',
              description: 'Has no image',
              image_url: null,
            },
          },
        ]),
      ],
    });

    await waitFor(() => expect(screen.getByText('Badges (2)')).toBeInTheDocument());
    expect(screen.getByText('Early Bird')).toBeInTheDocument();
    expect(screen.getByText('No Icon Badge')).toBeInTheDocument();

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://cdn.test/early-bird.png');
  });
});
