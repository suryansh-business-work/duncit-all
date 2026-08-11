import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactNode } from 'react';

import { findTour } from '@duncit/tours';

import { NativeTourProvider } from '@/tours/NativeTourProvider';
import { TourAnchor } from '@/tours/TourAnchor';
import { TOUR_SETTLE_MS } from '@/tours/visibleSteps';
import { useMe } from '@/hooks/useMe';
import { useThemeStore } from '@/stores/theme.store';
import { useToursStore } from '@/stores/tours.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockUseMe = useMe as jest.Mock;

/** A screen fragment carrying the named Home anchors, in the order given. */
function Screen({ anchors }: Readonly<{ anchors: readonly string[] }>) {
  return (
    <>
      {anchors.map((anchor) => (
        <TourAnchor key={anchor} tour="home" anchor={anchor}>
          <Text testID={anchor}>{anchor}</Text>
        </TourAnchor>
      ))}
    </>
  );
}

const mount = (children: ReactNode) =>
  renderWithProviders(<NativeTourProvider>{children}</NativeTourProvider>);

const withAnchors = (anchors: readonly string[]) => (
  <NativeTourProvider>
    <Screen anchors={anchors} />
  </NativeTourProvider>
);

/** Let the settle window elapse so the resolved step list is locked in. */
const settle = () =>
  act(() => {
    jest.advanceTimersByTime(TOUR_SETTLE_MS + 100);
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUseMe.mockReturnValue({ data: { me: { user_id: 'u1' } } });
  useThemeStore.setState({ scheme: 'light' });
  useToursStore.setState({
    completed: [],
    activeTourId: null,
    activeSteps: [],
    mountedAnchors: [],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('NativeTourProvider', () => {
  it('renders the app with no overlay while no tour is running', () => {
    mount(<Text testID="app">app</Text>);
    expect(screen.getByTestId('app')).toBeOnTheScreen();
    expect(screen.queryByTestId('tour-overlay')).toBeNull();
  });

  it('never opens a tour whose anchors are nowhere on screen', () => {
    useToursStore.setState({ activeTourId: 'home' });
    mount(<Text testID="app">app</Text>);
    settle();
    // The "blank tour": an overlay with nothing to spotlight.
    expect(screen.queryByTestId('tour-overlay')).toBeNull();
    expect(useToursStore.getState().activeSteps).toEqual([]);
  });

  it('opens on the first step once the screen has settled', () => {
    useToursStore.setState({ activeTourId: 'home' });
    mount(<Screen anchors={['home-pods', 'home-clubs']} />);
    settle();

    expect(screen.getByTestId('tour-overlay')).toBeOnTheScreen();
    expect(screen.getByText('What are Pods?')).toBeOnTheScreen();
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('1 / 2');
  });

  it('numbers zones by registry order, not by the order anchors mounted', () => {
    useToursStore.setState({ activeTourId: 'home' });
    // Clubs is the SECOND Home step but mounts first here.
    mount(<Screen anchors={['home-clubs', 'home-pods']} />);
    settle();

    expect(screen.getByTestId('tour-zone-home-1')).toContainElement(
      screen.getByTestId('home-pods'),
    );
    expect(screen.getByTestId('tour-zone-home-2')).toContainElement(
      screen.getByTestId('home-clubs'),
    );
  });

  it('starts straight away when every anchor is already on screen', () => {
    useToursStore.setState({ activeTourId: 'home' });
    const anchors = [
      'home-pods',
      'home-clubs',
      'home-search',
      'home-categories',
      'home-filters',
      'home-notifications',
      'home-profile',
    ];
    mount(<Screen anchors={anchors} />);
    // No settle wait: a complete screen has nothing left to wait for.
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('1 / 7');
  });

  // The bug this freeze exists to stop: a section arriving mid-walkthrough used
  // to renumber every step behind it and jump the spotlight.
  it('ignores an anchor that arrives after the step list is locked in', () => {
    useToursStore.setState({ activeTourId: 'home' });
    const view = mount(<Screen anchors={['home-clubs', 'home-search']} />);
    settle();
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('1 / 2');

    view.rerender(
      <NativeTourProvider>
        <Screen anchors={['home-clubs', 'home-search', 'home-pods']} />
      </NativeTourProvider>,
    );
    settle();

    expect(screen.getByTestId('tour-progress')).toHaveTextContent('1 / 2');
    expect(screen.getByText('What are Clubs?')).toBeOnTheScreen();
    expect(screen.queryByTestId('tour-zone-home-3')).toBeNull();
  });

  // A refetch swaps one section out; the rest of the screen, and the tour, stay.
  it('keeps its place when one of the screen’s sections re-renders away', () => {
    useToursStore.setState({ activeTourId: 'home' });
    const view = mount(<Screen anchors={['home-pods', 'home-clubs']} />);
    settle();
    fireEvent.press(screen.getByTestId('tour-next'));
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('2 / 2');

    view.rerender(withAnchors(['home-pods']));

    expect(screen.getByTestId('tour-overlay')).toBeOnTheScreen();
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('2 / 2');
  });

  /*
    Leaving the screen mid-tour used to leave the scrim up over the next screen,
    pointing at a rectangle that no longer existed. Ending counts as shown, the
    same as Skip.
  */
  it('ends the tour when the screen it was running on goes away', async () => {
    useToursStore.setState({ activeTourId: 'home' });
    const view = mount(<Screen anchors={['home-pods', 'home-clubs']} />);
    settle();
    expect(screen.getByTestId('tour-overlay')).toBeOnTheScreen();

    await act(async () => {
      view.rerender(withAnchors([]));
    });

    expect(screen.queryByTestId('tour-overlay')).toBeNull();
    expect(useToursStore.getState().activeTourId).toBeNull();
    expect(useToursStore.getState().completed).toEqual(['home']);
  });

  // A tour armed for a screen the user has not opened yet has nothing on
  // display — ending it would burn the "shown once" flag on a tour never shown.
  it('leaves an armed-but-unopened tour alone when the screen has no anchors', () => {
    useToursStore.setState({
      activeTourId: 'club',
      activeSteps: [...(findTour('club')?.steps ?? [])],
    });
    mount(<Text testID="app">app</Text>);
    settle();

    expect(useToursStore.getState().activeTourId).toBe('club');
    expect(useToursStore.getState().completed).toEqual([]);
  });

  it('walks forward and back through the steps', () => {
    useToursStore.setState({ activeTourId: 'home' });
    mount(<Screen anchors={['home-pods', 'home-clubs']} />);
    settle();

    fireEvent.press(screen.getByTestId('tour-next'));
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('2 / 2');
    expect(screen.getByText('What are Clubs?')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('tour-previous'));
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('1 / 2');
  });

  it('records the tour as shown when it is finished', async () => {
    useToursStore.setState({ activeTourId: 'home' });
    mount(<Screen anchors={['home-pods']} />);
    settle();

    await act(async () => {
      fireEvent.press(screen.getByTestId('tour-next'));
    });

    expect(useToursStore.getState().completed).toEqual(['home']);
    expect(useToursStore.getState().activeTourId).toBeNull();
    expect(screen.queryByTestId('tour-overlay')).toBeNull();
  });

  it('records a skipped tour too — the user has been shown it either way', async () => {
    useToursStore.setState({ activeTourId: 'home' });
    mount(<Screen anchors={['home-pods', 'home-clubs']} />);
    settle();

    await act(async () => {
      fireEvent.press(screen.getByTestId('tour-skip'));
    });

    expect(useToursStore.getState().completed).toEqual(['home']);
  });

  it('falls back to the anon bucket before the viewer resolves', async () => {
    mockUseMe.mockReturnValue({ data: undefined });
    useToursStore.setState({ activeTourId: 'home' });
    mount(<Screen anchors={['home-pods']} />);
    settle();

    await act(async () => {
      fireEvent.press(screen.getByTestId('tour-skip'));
    });

    expect(useToursStore.getState().completed).toEqual(['home']);
  });

  it('drops the tour when the registry no longer has it', () => {
    useToursStore.setState({ activeTourId: 'retired' as never });
    mount(<Screen anchors={['home-pods']} />);
    settle();
    expect(screen.queryByTestId('tour-overlay')).toBeNull();
  });

  it('dims harder on the dark theme than on the light one', () => {
    useToursStore.setState({ activeTourId: 'home' });
    const view = mount(<Screen anchors={['home-pods']} />);
    settle();
    expect(screen.getByTestId('tour-backdrop')).toHaveStyle({
      backgroundColor: 'rgba(16, 16, 20, 0.62)',
    });

    act(() => {
      useThemeStore.setState({ scheme: 'dark' });
    });
    view.rerender(
      <NativeTourProvider>
        <Screen anchors={['home-pods']} />
      </NativeTourProvider>,
    );

    expect(screen.getByTestId('tour-backdrop')).toHaveStyle({
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    });
  });
});
