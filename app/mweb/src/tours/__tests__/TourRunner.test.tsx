import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TourProvider, useTours } from '../TourContext';
import { TourRunner } from '../TourRunner';

const store = { getItem: vi.fn(() => null), setItem: vi.fn() };

/** Every anchor the Home tour names, so nothing is left to wait for. */
const HOME_ANCHORS = [
  'home-pods',
  'home-clubs',
  'home-search',
  'home-categories',
  'home-filters',
  'home-notifications',
  'home-profile',
];

/** The query useFeatureFlag reads; `tour_guide` is the runner's kill switch. */
const PUBLIC_FLAGS = gql`
  query PublicFeatureFlags {
    publicFeatureFlags {
      key
      enabled
    }
  }
`;

const flagsMock = (enabled: boolean) => ({
  request: { query: PUBLIC_FLAGS },
  result: { data: { publicFeatureFlags: [{ key: 'tour_guide', enabled }] } },
});

/** Starts a tour from inside the provider, like the Tour Guide centre does. */
function Starter() {
  const { startTour } = useTours();
  return (
    <button type="button" onClick={() => startTour('home')}>
      start
    </button>
  );
}

function mount(anchors: string[], tourGuideEnabled = true) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[flagsMock(tourGuideEnabled)]}>
      <MemoryRouter>
        <TourProvider userId="u1" storage={store}>
          {anchors.map((a) => (
            <div key={a} data-tour={a}>
              {a}
            </div>
          ))}
          <Starter />
          <TourRunner />
        </TourProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TourRunner', () => {
  it('starts at once when the whole screen is already there', async () => {
    mount(HOME_ANCHORS);
    act(() => {
      screen.getByRole('button', { name: 'start' }).click();
    });
    // Every anchor resolved, so there is nothing to wait for — and the tour
    // opens on its FIRST step, not on whichever one happened to be mounted.
    expect(await screen.findByText('What are Pods?')).toBeInTheDocument();
  });

  it('waits for the rest of the screen rather than starting on the header', async () => {
    // The header is up before the feed is. Taking that first answer opened the
    // Home tour on "Notifications" — five steps in, with the rest dropped.
    const { container } = mount(['home-notifications', 'home-profile']);
    act(() => {
      screen.getByRole('button', { name: 'start' }).click();
    });

    const late = globalThis.document.createElement('div');
    late.setAttribute('data-tour', 'home-pods');
    act(() => {
      container.append(late);
    });

    expect(await screen.findByText('What are Pods?', undefined, { timeout: 4000 })).toBeInTheDocument();
  });

  it('waits for late-arriving content instead of giving up', async () => {
    const { container } = mount([]);
    act(() => {
      screen.getByRole('button', { name: 'start' }).click();
    });
    // Home's data has not landed yet, so nothing renders...
    await waitFor(() => expect(screen.queryByText('What are Pods?')).toBeNull());

    // ...and when it does, the armed tour picks it up without another click.
    const late = globalThis.document.createElement('div');
    late.setAttribute('data-tour', 'home-pods');
    act(() => {
      container.append(late);
    });
    expect(await screen.findByText('What are Pods?', undefined, { timeout: 4000 })).toBeInTheDocument();
  });

  it('opens nothing when the tour_guide kill switch is off', async () => {
    mount(HOME_ANCHORS, false);
    act(() => {
      screen.getByRole('button', { name: 'start' }).click();
    });
    // Every anchor is there, so with the flag on the tour would open at once;
    // give it longer than the poll needs and it must still be closed.
    await new Promise((resolve) => globalThis.setTimeout(resolve, 600));
    expect(screen.queryByText('What are Pods?')).toBeNull();
  });

  it('renders nothing while no tour is active', () => {
    mount(['home-pods']);
    expect(screen.queryByText('What are Pods?')).toBeNull();
  });
});
