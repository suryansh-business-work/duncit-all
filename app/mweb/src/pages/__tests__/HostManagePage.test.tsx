import '@testing-library/jest-dom/vitest';
import type { ReactElement, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Stub the composed child cards so this page's own logic is exercised in
// isolation (each child otherwise fires its own GraphQL queries).
vi.mock('../HostDraftsCard', () => ({
  default: () => <div data-testid="drafts-card" />,
}));
vi.mock('../host-manage-page/HostPodSections', () => ({
  default: (props: {
    pods: unknown[];
    loading: boolean;
    errorMessage?: string;
    onChanged: () => void;
  }) => (
    <div data-testid="pods-card">
      <span data-testid="pods-count">{props.pods.length}</span>
      <span data-testid="pods-loading">{String(props.loading)}</span>
      <span data-testid="pods-error">{props.errorMessage ?? ''}</span>
      <button type="button" onClick={props.onChanged}>
        fire-changed
      </button>
    </div>
  ),
}));

// The shared pod-action dialogs' provider: a pass-through here, so the page's
// own wiring is what is under test.
vi.mock('../host-manage-page/HostPodActionsBridge', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="pod-actions-bridge">{children}</div>
  ),
}));

import HostManagePage from '../HostManagePage';

const ME_QUERY = gql`
  query MeForHostManage {
    me {
      user_id
      full_name
      roles
    }
  }
`;

const HOST_PODS = gql`
  query MyHostedPods {
    myHostPods {
      id
      pod_title
      pod_id
      club_id
      club_slug
      pod_date_time
      pod_end_date_time
      pod_description
      pod_images_and_videos {
        url
        type
      }
      pod_amount
      pod_type
      pod_mode
      no_of_spots
      ticket_discount_enabled
      ticket_discount_tiers {
        min_tickets
        discount_pct
      }
      seats_taken
      location_id
      venue_id
      zone_name
      place_label
      venue_approval_status
      is_active
      created_at
    }
  }
`;

const meMock = (roles: string[] = ['HOST']) => ({
  request: { query: ME_QUERY },
  result: {
    data: { me: { user_id: 'u1', full_name: 'Host User', roles } },
  },
});

const hostPodsMock = (pods: unknown[] = []) => ({
  request: { query: HOST_PODS },
  result: { data: { myHostPods: pods } },
});

const setup = (mocks: unknown[], ui: ReactElement) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as never}>
      <MemoryRouter initialEntries={['/host']}>{ui}</MemoryRouter>
    </MockedProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('HostManagePage', () => {
  it('renders the header with Create as its one action', () => {
    setup([meMock()], <HostManagePage />);
    expect(screen.getByText('Your Pods')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create/i })).toHaveAttribute(
      'href',
      '/create-pod',
    );
    // The dashboard is a Host Options entry now, not a header link.
    expect(screen.queryByRole('link', { name: /Insights/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('drafts-card')).toBeInTheDocument();
    // The pod sections sit inside the pod-actions provider.
    expect(screen.getByTestId('pod-actions-bridge')).toContainElement(
      screen.getByTestId('pods-card'),
    );
  });

  it('shows boot loading while the me query is in flight', () => {
    setup([meMock()], <HostManagePage />);
    // Before me resolves there is no userId, so pods query is skipped but
    // meQ.loading + no data => bootLoading true.
    expect(screen.getByTestId('pods-loading')).toHaveTextContent('true');
  });

  it('lists the hosted pods once queries resolve, and nothing besides pods', async () => {
    setup(
      [meMock(['HOST']), hostPodsMock([{ id: 'p1' }, { id: 'p2' }])],
      <HostManagePage />,
    );
    await waitFor(() => expect(screen.getByTestId('pods-count')).toHaveTextContent('2'));
    expect(screen.getByTestId('pods-loading')).toHaveTextContent('false');
    // Each of these is its own Host Options page now.
    expect(screen.queryByTestId('host-apply-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('host-share-section')).not.toBeInTheDocument();
  });

  it('passes the pods query error message down to HostPodSections', async () => {
    setup(
      [
        meMock(['HOST']),
        { request: { query: HOST_PODS }, error: new Error('pods-boom') },
      ],
      <HostManagePage />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('pods-error')).toHaveTextContent('pods-boom'),
    );
  });

  it('refetches without throwing when onChanged fires', async () => {
    setup([meMock(['HOST']), hostPodsMock([])], <HostManagePage />);
    await screen.findByTestId('pods-count');
    fireEvent.click(screen.getByRole('button', { name: 'fire-changed' }));
    // onChanged calls refetch().catch(...); assert it did not throw.
    expect(screen.getByTestId('pods-card')).toBeInTheDocument();
  });
});
