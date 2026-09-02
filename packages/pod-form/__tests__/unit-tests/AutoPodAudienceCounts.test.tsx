import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutoPodAudienceCounts from '../../src/auto-pod/AutoPodAudienceCounts';
import type { AutoPodAudience } from '../../src/auto-pod/audience-queries';

const audience = (over: Partial<AutoPodAudience> = {}): AutoPodAudience => ({
  venue_count: 3,
  host_count: 5,
  club_admin_count: 2,
  venues: [],
  hosts: [],
  club_admins: [],
  ...over,
});

describe('AutoPodAudienceCounts', () => {
  it('draws a dash per role before anything is counted, with nothing to open', () => {
    render(<AutoPodAudienceCounts audience={null} loading={false} error={null} onOpen={vi.fn()} />);
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByTestId('auto-pod-audience-venues')).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows each count as a button and opens the drawer for the one pressed', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<AutoPodAudienceCounts audience={audience()} loading={false} error={null} onOpen={onOpen} />);
    expect(screen.getByRole('button', { name: 'Venues: 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hosts: 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Club admins: 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hosts: 5' }));
    expect(onOpen).toHaveBeenCalledWith('hosts');
    // Every count is above zero — nothing to warn about.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('names every role with nobody in it, because such an offer could never go live', () => {
    render(
      <AutoPodAudienceCounts
        audience={audience({ venue_count: 0, club_admin_count: 0 })}
        loading={false}
        error={null}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This category has no venues, club admins yet');
  });

  it('says it is counting, then reports a count that failed', () => {
    const { rerender } = render(
      <AutoPodAudienceCounts audience={null} loading error={null} onOpen={vi.fn()} />,
    );
    expect(screen.getByText('Counting…')).toBeInTheDocument();
    rerender(<AutoPodAudienceCounts audience={null} loading={false} error="boom" onOpen={vi.fn()} />);
    expect(screen.queryByText('Counting…')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not count the partners for this category.');
  });
});
