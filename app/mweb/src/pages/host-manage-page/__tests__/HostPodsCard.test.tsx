import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import HostPodsCard from '../HostPodsCard';

// A pod far in the future => podStatus === 'UPCOMING' (the default time filter).
const FUTURE = '2099-08-01T10:00:00.000Z';
const PAST = '2000-01-01T10:00:00.000Z';

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  pod_id: 'pod-1',
  club_slug: 'club-x',
  pod_title: 'Sunset Yoga',
  pod_date_time: FUTURE,
  pod_end_date_time: null,
  zone_name: 'North Zone',
  pod_type: 'PAID_POD',
  pod_mode: 'PHYSICAL',
  venue_id: 'venue-1',
  venue_approval_status: 'APPROVED',
  ...over,
});

describe('HostPodsCard', () => {
  it('shows a spinner while loading', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[]} loading onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Your pods')).toBeInTheDocument();
  });

  it('shows the error alert when errorMessage is set', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[]} loading={false} errorMessage="Boom" onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('shows the empty state when there are no pods', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[]} loading={false} onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(screen.getByText(/You don't host any pods yet/)).toBeInTheDocument();
  });

  it('shows the no-match state when pods exist but none pass the default filter', () => {
    // Past pods never match the default UPCOMING time filter.
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[pod({ pod_date_time: PAST })]} loading={false} onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(screen.getByText(/No pods match these filters/)).toBeInTheDocument();
  });

  it('renders a row for each visible pod and reflects the count chip', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard
            pods={[pod(), pod({ id: 'doc-2', pod_id: 'pod-2', pod_title: 'Morning Run' })]}
            loading={false}
            onChanged={vi.fn()}
          />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(screen.getByText('Sunset Yoga')).toBeInTheDocument();
    expect(screen.getByText('Morning Run')).toBeInTheDocument();
  });

  it('opens the filter sheet and applies a filter that hides all rows', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[pod()]} loading={false} onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(screen.getByText('Sunset Yoga')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Filter pods'));
    // Filter sheet is open — pick a filter that excludes the PHYSICAL/PAID pod.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Virtual'));
    fireEvent.click(within(dialog).getByText('Apply'));
    expect(screen.getByText(/No pods match these filters/)).toBeInTheDocument();
  });

  it('opens the complete dialog from a row', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[pod()]} loading={false} onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    fireEvent.click(screen.getByLabelText('Complete pod'));
    expect(screen.getByText('Complete pod', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the limited edit dialog for a normal pod', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[pod()]} loading={false} onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    fireEvent.click(screen.getByLabelText('Edit pod'));
    expect(screen.getByText('Edit pod', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the resubmit dialog for a venue-rejected pod', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard
            pods={[pod({ venue_approval_status: 'DECLINED' })]}
            loading={false}
            onChanged={vi.fn()}
          />
        </MemoryRouter>
      </MockedProvider>,
    );
    fireEvent.click(screen.getByLabelText('Edit pod'));
    expect(screen.getByText('Edit & resubmit pod', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the delete dialog from a row', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <HostPodsCard pods={[pod()]} loading={false} onChanged={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>,
    );
    fireEvent.click(screen.getByLabelText('Delete pod'));
    expect(screen.getByText('Delete pod', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/You're deleting/)).toBeInTheDocument();
  });
});
