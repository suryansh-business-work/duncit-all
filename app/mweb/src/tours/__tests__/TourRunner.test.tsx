import { MockedProvider } from '@apollo/client/testing';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TourProvider, useTours } from '../TourContext';
import { TourRunner } from '../TourRunner';

const store = { getItem: vi.fn(() => null), setItem: vi.fn() };

/** Starts a tour from inside the provider, like the Tour Guide centre does. */
function Starter() {
  const { startTour } = useTours();
  return (
    <button type="button" onClick={() => startTour('home')}>
      start
    </button>
  );
}

function mount(anchors: string[]) {
  return render(
    <MockedProvider mocks={[]}>
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
  it('renders the walkthrough once a tour is started and its anchors exist', async () => {
    mount(['home-pods', 'home-clubs']);
    act(() => {
      screen.getByRole('button', { name: 'start' }).click();
    });
    // The first Home step's copy is what the user should actually see.
    expect(await screen.findByText('What are Pods?')).toBeInTheDocument();
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
    expect(await screen.findByText('What are Pods?')).toBeInTheDocument();
  });

  it('renders nothing while no tour is active', () => {
    mount(['home-pods']);
    expect(screen.queryByText('What are Pods?')).toBeNull();
  });
});
