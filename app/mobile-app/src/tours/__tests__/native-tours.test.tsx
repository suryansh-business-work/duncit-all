import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { buildSpotlightSteps } from '@/tours/NativeTourProvider';
import { TourAnchor } from '@/tours/TourAnchor';
import { TourCard } from '@/tours/TourCard';
import { findTour } from '@duncit/tours';
import { useMe } from '@/hooks/useMe';
import { useToursStore } from '@/stores/tours.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockUseMe = useMe as jest.Mock;

/** Every Home anchor, as if the whole screen were on display. */
const HOME_ANCHORS = findTour('home')!.steps.map((step) => step.anchor);

/** spotlight-tour hands these to a step's `render`. */
const renderProps = (over: Partial<Record<string, unknown>> = {}) => ({
  current: 0,
  goTo: jest.fn(),
  isFirst: true,
  isLast: false,
  next: jest.fn(),
  pause: jest.fn(),
  previous: jest.fn(),
  resume: jest.fn(),
  stop: jest.fn(),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMe.mockReturnValue({ data: { me: { user_id: 'u1', roles: [] } } });
  useToursStore.setState({ completed: [], activeTourId: null });
});

// The overlay itself only draws once the host measures a real layout, which
// jest never does — so these cover the mapping and the controls, which is the
// part this app owns.
describe('buildSpotlightSteps', () => {
  it('maps a registry tour to one step per anchor, in order', () => {
    const steps = buildSpotlightSteps('home', HOME_ANCHORS);
    expect(steps).toHaveLength(7);
    renderWithProviders(steps[0]!.render(renderProps() as never));
    expect(screen.getByText('What are Pods?')).toBeOnTheScreen();
    expect(screen.getByText('1 / 7')).toBeOnTheScreen();
  });

  it('is empty for no tour and for an id that no longer exists', () => {
    expect(buildSpotlightSteps(null, HOME_ANCHORS)).toEqual([]);
    expect(buildSpotlightSteps('retired-tour', HOME_ANCHORS)).toEqual([]);
  });

  it('advances with Next on a middle step', () => {
    const props = renderProps({ isFirst: false, current: 1 });
    renderWithProviders(buildSpotlightSteps('home', HOME_ANCHORS)[1]!.render(props as never));
    fireEvent.press(screen.getByTestId('tour-next'));
    expect(props.next).toHaveBeenCalled();
    expect(props.stop).not.toHaveBeenCalled();
  });

  it('finishes rather than advancing past the last step', () => {
    const props = renderProps({ isFirst: false, isLast: true, current: 6 });
    renderWithProviders(buildSpotlightSteps('home', HOME_ANCHORS)[6]!.render(props as never));
    fireEvent.press(screen.getByTestId('tour-next'));
    expect(props.stop).toHaveBeenCalled();
    expect(props.next).not.toHaveBeenCalled();
  });

  it('goes back with Previous and ends with Skip', () => {
    const props = renderProps({ isFirst: false });
    renderWithProviders(buildSpotlightSteps('home', HOME_ANCHORS)[2]!.render(props as never));
    fireEvent.press(screen.getByTestId('tour-previous'));
    expect(props.previous).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('tour-skip'));
    expect(props.stop).toHaveBeenCalled();
  });
});

describe('TourCard', () => {
  const base = {
    title: 'T',
    body: 'B',
    position: 1,
    total: 3,
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    onSkip: jest.fn(),
  };

  it('hides Previous on the first step', () => {
    renderWithProviders(<TourCard {...base} isFirst isLast={false} />);
    expect(screen.queryByTestId('tour-previous')).toBeNull();
    expect(screen.getByTestId('tour-next')).toHaveTextContent('Next');
  });

  it('labels the primary button Finish on the last step', () => {
    renderWithProviders(<TourCard {...base} isFirst={false} isLast />);
    expect(screen.getByTestId('tour-previous')).toBeOnTheScreen();
    expect(screen.getByTestId('tour-next')).toHaveTextContent('Finish');
  });
});

describe('TourAnchor', () => {
  const anchored = (
    <TourAnchor tour="home" anchor="home-pods">
      <Text testID="pods">pods</Text>
    </TourAnchor>
  );

  it('renders the child untouched while no tour is running', () => {
    renderWithProviders(anchored);
    expect(screen.getByTestId('pods')).toBeOnTheScreen();
    expect(screen.queryByTestId('attach-wrapper-view')).toBeNull();
  });

  // An anchor belongs to one tour; another tour must not hijack it, or its
  // step indices would point at the wrong element.
  it('renders the child untouched while a DIFFERENT tour is running', () => {
    act(() => useToursStore.getState().startTour('booking'));
    renderWithProviders(anchored);
    expect(screen.queryByTestId('attach-wrapper-view')).toBeNull();
  });

  it('attaches the child once its own tour is running', () => {
    act(() => useToursStore.getState().startTour('home'));
    renderWithProviders(anchored);
    expect(screen.getByTestId('attach-wrapper-view')).toBeOnTheScreen();
    expect(screen.getByTestId('pods')).toBeOnTheScreen();
  });

  it('leaves an anchor that is not part of the tour alone', () => {
    act(() => useToursStore.getState().startTour('home'));
    renderWithProviders(
      <TourAnchor tour="home" anchor="not-a-real-anchor">
        <Text testID="other">other</Text>
      </TourAnchor>,
    );
    expect(screen.queryByTestId('attach-wrapper-view')).toBeNull();
    expect(screen.getByTestId('other')).toBeOnTheScreen();
  });
});
