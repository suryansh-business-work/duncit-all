import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Stub the composed child cards so this page's own logic is exercised in
// isolation (each child otherwise fires its own GraphQL queries).
vi.mock('../HostDraftsCard', () => ({
  default: () => <div data-testid="drafts-card" />,
}));
vi.mock('../host-manage-page/HostShareCard', () => ({
  default: () => <div data-testid="share-card" />,
}));
vi.mock('../host-apply-page/HostApplyBanner', () => ({
  default: () => <div data-testid="apply-banner" />,
}));
vi.mock('../host-apply-page/HostCategoriesCard', () => ({
  default: () => <div data-testid="categories-card" />,
}));
vi.mock('../host-manage-page/HostPodsCard', () => ({
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
      location_id
      venue_id
      zone_name
      venue_approval_status
      is_active
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
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <MemoryRouter initialEntries={['/host']}>{ui}</MemoryRouter>
    </MockedProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('HostManagePage', () => {
  it('renders the header and static action links', () => {
    setup([meMock()], <HostManagePage />);
    expect(screen.getByText('Your Pods')).toBeInTheDocument();
    expect(screen.getByText('Manage the pods you host')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Insights/i })).toHaveAttribute(
      'href',
      '/host/dashboard',
    );
    expect(screen.getByRole('link', { name: /Create/i })).toHaveAttribute(
      'href',
      '/create-pod',
    );
    // Drafts + share cards always render.
    expect(screen.getByTestId('drafts-card')).toBeInTheDocument();
    expect(screen.getByTestId('share-card')).toBeInTheDocument();
  });

  it('shows boot loading while the me query is in flight', () => {
    setup([meMock()], <HostManagePage />);
    // Before me resolves there is no userId, so pods query is skipped but
    // meQ.loading + no data => bootLoading true.
    expect(screen.getByTestId('pods-loading')).toHaveTextContent('true');
  });

  it('renders host-only cards and the hosted pods once queries resolve', async () => {
    setup(
      [meMock(['HOST']), hostPodsMock([{ id: 'p1' }, { id: 'p2' }])],
      <HostManagePage />,
    );
    expect(await screen.findByTestId('categories-card')).toBeInTheDocument();
    expect(screen.getByTestId('apply-banner')).toBeInTheDocument();
    expect(await screen.findByTestId('pods-count')).toHaveTextContent('2');
    expect(screen.getByTestId('pods-loading')).toHaveTextContent('false');
  });

  it('hides host-only cards for a non-host user', async () => {
    setup([meMock([]), hostPodsMock([])], <HostManagePage />);
    // Wait for me to resolve so pods query runs.
    expect(await screen.findByTestId('pods-count')).toHaveTextContent('0');
    expect(screen.queryByTestId('categories-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apply-banner')).not.toBeInTheDocument();
  });

  it('passes the pods query error message down to HostPodsCard', async () => {
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
