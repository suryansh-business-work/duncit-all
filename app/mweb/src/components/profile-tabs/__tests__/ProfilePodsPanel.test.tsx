import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ProfilePodsPanel from '../ProfilePodsPanel';
import { USER_HOSTED_PODS, USER_JOINED_PODS } from '../queries';

// The request card has its own suite; here only whether and for whom it is offered.
vi.mock('../../event-request', () => ({
  RequestEventCard: (props: { targetType: string; targetId: string; targetName: string }) => (
    <div data-testid="request-event-stub">
      {props.targetType}|{props.targetId}|{props.targetName}
    </div>
  ),
}));

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();

/** Every field the profile selection asks for, so the answer reaches the cache whole. */
const pod = (id: string, title: string, startsIn: number) => ({
  id,
  pod_id: `POD-${id}`,
  pod_title: title,
  pod_date_time: iso(startsIn),
  pod_end_date_time: iso(startsIn + 2 * HOUR),
  pod_type: 'PAID',
  pod_amount: 500,
  pod_attendees: 2,
  seats_taken: 2,
  no_of_spots: 10,
  pod_hosts_id: ['u1'],
  host_names: ['Asha'],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 'club-one',
  location_id: null,
  zone_name: null,
  place_label: 'Cafe',
  place_detail: 'Indiranagar',
});

const hostedMock = (pods: unknown[] | Error): MockedResponse => ({
  request: { query: USER_HOSTED_PODS, variables: { user_id: 'u1' } },
  ...(pods instanceof Error ? { error: pods } : { result: { data: { pods } } }),
});

const renderPanel = (mocks: MockedResponse[], props: Partial<Parameters<typeof ProfilePodsPanel>[0]> = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter>
        <ProfilePodsPanel userId="u1" kind="hosted" {...props} />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('ProfilePodsPanel — hosted pods on someone else’s profile', () => {
  it('offers "Request an event" from the host under the empty state when they host nothing', async () => {
    renderPanel([hostedMock([])], { requestFromHost: 'Asha' });
    expect(screen.getByTestId('profile-pods-hosted-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('request-event-stub')).not.toBeInTheDocument();
    expect(await screen.findByTestId('profile-pods-hosted-empty')).toHaveTextContent('No pods hosted yet.');
    expect(screen.getByTestId('request-event-stub')).toHaveTextContent('HOST|u1|Asha');
  });

  it('offers it under the cards when every hosted pod is in the past', async () => {
    renderPanel([hostedMock([pod('p1', 'Old Jam', -3 * DAY)])], { requestFromHost: 'Asha' });
    expect(await screen.findByText('Old Jam')).toBeInTheDocument();
    expect(screen.getByTestId('profile-pods-hosted')).toBeInTheDocument();
    expect(screen.getByTestId('request-event-stub')).toBeInTheDocument();
  });

  it('keeps each card within its column so a narrow profile never scrolls sideways', async () => {
    renderPanel([hostedMock([pod('p1', 'Old Jam', -3 * DAY)])]);
    const card = await screen.findByTestId('pod-card-POD-p1');
    expect(card).toHaveStyle({ width: '268px', maxWidth: '100%' });
    expect(getComputedStyle(card).minWidth).not.toBe('268px');
  });

  it('does not offer it while the host has something coming up', async () => {
    renderPanel([hostedMock([pod('p1', 'Old Jam', -3 * DAY), pod('p2', 'Next Jam', 3 * DAY)])], {
      requestFromHost: 'Asha',
    });
    expect(await screen.findByText('Next Jam')).toBeInTheDocument();
    expect(screen.queryByTestId('request-event-stub')).not.toBeInTheDocument();
  });

  it('never offers it on the member’s own profile', async () => {
    renderPanel([hostedMock([])]);
    expect(await screen.findByTestId('profile-pods-hosted-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('request-event-stub')).not.toBeInTheDocument();
  });

  it('says the pods could not be loaded, with no request card', async () => {
    renderPanel([hostedMock(new Error('Network down'))], { requestFromHost: 'Asha' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Pods could not be loaded.');
    expect(screen.queryByTestId('request-event-stub')).not.toBeInTheDocument();
  });
});

describe('ProfilePodsPanel — joined pods', () => {
  it('never offers a request card on the Joined tab', async () => {
    renderPanel(
      [{ request: { query: USER_JOINED_PODS, variables: { user_id: 'u1' } }, result: { data: { userJoinedPods: [] } } }],
      { kind: 'joined', requestFromHost: 'Asha' },
    );
    expect(await screen.findByTestId('profile-pods-joined-empty')).toHaveTextContent('No pods joined yet.');
    expect(screen.queryByTestId('request-event-stub')).not.toBeInTheDocument();
  });
});
