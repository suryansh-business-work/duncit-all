import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodListCard from '../PodListCard';
import type { DashboardPod } from '../queries';

const makePod = (over: Partial<DashboardPod> = {}): DashboardPod => ({
  id: 'pod-doc-1',
  pod_id: 'DUN-POD-4821',
  title: 'Sunday board games',
  starts_at: '2026-10-04T12:30:00.000Z',
  spots: 12,
  filled: 9,
  rating_average: 4.62,
  rating_count: 18,
  ...over,
});

describe('PodListCard', () => {
  it('renders the heading and the empty text when there are no pods', () => {
    renderWithProviders(
      <PodListCard title="Best rated" subtitle="Highest scoring pods" pods={[]} emptyText="No pod has been rated yet." />,
    );
    expect(screen.getByText('Best rated')).toBeInTheDocument();
    expect(screen.getByText('Highest scoring pods')).toBeInTheDocument();
    expect(screen.getByText('No pod has been rated yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('lists upcoming pods with their start time and seats sold, each linking to the pod', () => {
    renderWithProviders(
      <PodListCard
        title="Starting next"
        subtitle="The pods coming up"
        pods={[makePod()]}
        emptyText="No upcoming pods."
      />,
    );
    expect(screen.queryByText('No upcoming pods.')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sunday board games' })).toHaveAttribute('href', '/pods/pod-doc-1');
    expect(screen.getByText(formatDateTime('2026-10-04T12:30:00.000Z'))).toBeInTheDocument();
    expect(screen.getByText('9/12')).toBeInTheDocument();
    expect(screen.queryByText('18 ratings')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a dash for an upcoming pod with no start time', () => {
    renderWithProviders(
      <PodListCard
        title="Starting next"
        subtitle="The pods coming up"
        pods={[makePod({ starts_at: null })]}
        emptyText="No upcoming pods."
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('leads a rated list with the score and rating count instead of the time and seats', () => {
    renderWithProviders(
      <PodListCard
        title="Best rated"
        subtitle="Highest scoring pods"
        pods={[makePod()]}
        emptyText="No pod has been rated yet."
        showRating
      />,
    );
    expect(screen.getByText('18 ratings')).toBeInTheDocument();
    expect(screen.getByText('4.6')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /4\.6 Stars/ })).toBeInTheDocument();
    expect(screen.queryByText('9/12')).not.toBeInTheDocument();
  });

  it('draws no stars for a rated-list pod that has no average yet', () => {
    renderWithProviders(
      <PodListCard
        title="Needs attention"
        subtitle="Rated below four"
        pods={[makePod({ id: 'pod-doc-2', rating_average: null, rating_count: 0 })]}
        emptyText="Nothing is scoring badly."
        showRating
      />,
    );
    expect(screen.getByText('0 ratings')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('9/12')).not.toBeInTheDocument();
  });
});
