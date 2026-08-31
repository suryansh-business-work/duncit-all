import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import BadgesPage from '..';
import { MY_BADGE_PROGRESS, type BadgeProgressRow } from '../queries';

const row = (over: Partial<BadgeProgressRow>): BadgeProgressRow => ({
  current: 4,
  target: 10,
  achieved: false,
  achieved_at: null,
  badge: {
    id: 'b-legend',
    title: 'Legend',
    description: 'Attend 10 or more pods.',
    image_url: '',
    condition_type: 'POD_ATTEND_COUNT',
    threshold: 10,
  },
  ...over,
});

const mockFor = (myBadgeProgress: BadgeProgressRow[]) => [
  { request: { query: MY_BADGE_PROGRESS }, result: { data: { myBadgeProgress } } },
];

const renderPage = (rows: BadgeProgressRow[]) =>
  render(
    <MockedProvider mocks={mockFor(rows)}>
      <BadgesPage />
    </MockedProvider>,
  );

describe('BadgesPage', () => {
  it('says so when nothing has been published yet', async () => {
    renderPage([]);
    expect(await screen.findByText(/No badges have been published/i)).toBeTruthy();
  });

  // The point of the page is what is still to be won, so a locked badge is
  // listed with its goal rather than hidden.
  it('lists a locked badge with its goal and unlock timeline', async () => {
    renderPage([row({})]);
    expect(await screen.findByText('Legend')).toBeTruthy();
    expect(screen.getByText('Attend 10 pods')).toBeTruthy();
    expect(screen.getByText(/since you joined Duncit/i)).toBeTruthy();
    expect(screen.getByText('4 / 10')).toBeTruthy();
    expect(screen.getByText('Locked')).toBeTruthy();
  });

  it('marks an earned badge achieved and counts it in the summary', async () => {
    renderPage([
      row({ current: 12, achieved: true, achieved_at: '2026-03-14T00:00:00.000Z' }),
      row({
        badge: {
          id: 'b-monthly',
          title: 'Monthly Maverick',
          description: '',
          image_url: '',
          condition_type: 'MONTHLY_POD_ATTEND_COUNT',
          threshold: 6,
        },
        target: 6,
        current: 2,
      }),
    ]);
    expect(await screen.findByText('Achieved')).toBeTruthy();
    expect(screen.getByText('1 of 2 unlocked')).toBeTruthy();
    // The monthly badge states its own goal and its own window — not the
    // lifetime one every counting badge otherwise carries.
    expect(screen.getByText('Attend 6 pods inside one calendar month')).toBeTruthy();
    expect(screen.getByText('Must all happen inside one calendar month')).toBeTruthy();
    // An achieved badge never reads past its goal.
    expect(screen.getByText('10 / 10')).toBeTruthy();
  });
});
