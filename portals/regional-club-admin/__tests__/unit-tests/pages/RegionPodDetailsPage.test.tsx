import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RegionPodDetailsPage from '../../../src/pages/RegionPodDetailsPage';

const pod = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
  noActions: () => null,
  noBanner: () => null,
}));

// The pod page itself is @duncit/pod-details' own subject; what this console
// decides is the scope, the way back and that it offers no actions.
vi.mock('@duncit/pod-details', () => ({
  NO_POD_ACTIONS: pod.noActions,
  NO_POD_BANNER: pod.noBanner,
  PodDetailsPage: (props: Record<string, unknown>) => {
    pod.props = props;
    return <div data-testid="pod-details-page" />;
  },
}));

describe('RegionPodDetailsPage', () => {
  it('opens the shared pod page at REGIONAL scope, read-only, with a way back to the Club Admins', () => {
    render(<RegionPodDetailsPage />);
    expect(screen.getByTestId('pod-details-page')).toBeInTheDocument();
    expect(pod.props).toEqual({
      scope: 'REGIONAL',
      backTo: '/club-admins',
      backLabel: 'Club Admins',
      actions: pod.noActions,
      banner: pod.noBanner,
    });
  });
});
