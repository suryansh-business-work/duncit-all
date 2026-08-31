import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileBadgesStrip from '../ProfileBadgesStrip';
import { MY_BADGE_PROGRESS, type BadgeProgressRow } from '../../badges-page/queries';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const row = (over: Partial<BadgeProgressRow>): BadgeProgressRow => ({
  current: 12,
  target: 10,
  achieved: true,
  achieved_at: '2026-03-14T00:00:00.000Z',
  badge: {
    id: 'b-legend',
    title: 'Legend',
    description: '',
    image_url: '',
    condition_type: 'POD_ATTEND_COUNT',
    threshold: 10,
  },
  ...over,
});

const renderStrip = (rows: BadgeProgressRow[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
      mocks={[{ request: { query: MY_BADGE_PROGRESS }, result: { data: { myBadgeProgress: rows } } }]}
    >
      <MemoryRouter>
        <ProfileBadgesStrip />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('ProfileBadgesStrip', () => {
  it('nudges a member who has not unlocked anything yet', async () => {
    renderStrip([]);
    expect(await screen.findByText(/No badges yet/i)).toBeTruthy();
  });

  // The profile shows what has been WON — the locked ones live on /badges.
  it('shows only the earned badges', async () => {
    renderStrip([
      row({}),
      row({
        achieved: false,
        achieved_at: null,
        current: 1,
        badge: {
          id: 'b-spark',
          title: 'Social Spark',
          description: '',
          image_url: '',
          condition_type: 'PLUS_ONE_POD_COUNT',
          threshold: 10,
        },
      }),
    ]);
    expect(await screen.findByText('Legend')).toBeTruthy();
    expect(screen.queryByText('Social Spark')).toBeNull();
  });
});
