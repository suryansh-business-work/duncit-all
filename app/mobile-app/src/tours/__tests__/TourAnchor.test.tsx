import { act, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { findTour, type TourStep } from '@duncit/tours';

import { TourAnchor } from '@/tours/TourAnchor';
import { useToursStore } from '@/stores/tours.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const homeSteps = findTour('home')!.steps;
const stepFor = (anchor: string) => homeSteps.find((s) => s.anchor === anchor) as TourStep;

const anchored = (
  <TourAnchor tour="home" anchor="home-pods">
    <Text testID="pods">pods</Text>
  </TourAnchor>
);

beforeEach(() => {
  useToursStore.setState({
    completed: [],
    activeTourId: null,
    activeSteps: [],
    mountedAnchors: [],
  });
});

describe('TourAnchor', () => {
  it('tells the store its anchor is on screen, and takes it back on unmount', () => {
    const view = renderWithProviders(anchored);
    expect(useToursStore.getState().mountedAnchors).toEqual(['home-pods']);
    view.unmount();
    expect(useToursStore.getState().mountedAnchors).toEqual([]);
  });

  it('renders the child untouched while no tour is running', () => {
    renderWithProviders(anchored);
    expect(screen.getByTestId('pods')).toBeOnTheScreen();
    expect(screen.queryByTestId('tour-zone-home-1')).toBeNull();
  });

  // An anchor belongs to one tour; another tour must not hijack it, or its
  // zone numbers would point at the wrong element.
  it('renders the child untouched while a DIFFERENT tour is running', () => {
    act(() => {
      useToursStore.setState({ activeTourId: 'booking', activeSteps: [stepFor('home-pods')] });
    });
    renderWithProviders(anchored);
    expect(screen.queryByTestId('tour-zone-home-1')).toBeNull();
    expect(screen.getByTestId('pods')).toBeOnTheScreen();
  });

  it('renders the child untouched until the step list has been locked in', () => {
    act(() => useToursStore.getState().startTour('home'));
    renderWithProviders(anchored);
    expect(screen.queryByTestId('tour-zone-home-1')).toBeNull();
  });

  it('becomes a numbered zone once its own step is in the locked list', () => {
    act(() => {
      useToursStore.setState({
        activeTourId: 'home',
        activeSteps: [stepFor('home-clubs'), stepFor('home-pods')],
      });
    });
    renderWithProviders(anchored);
    // Second in the list → zone 2, whatever order the anchors mounted in.
    expect(screen.getByTestId('tour-zone-home-2')).toContainElement(screen.getByTestId('pods'));
  });

  it('leaves an anchor that the tour dropped alone', () => {
    act(() => {
      useToursStore.setState({ activeTourId: 'home', activeSteps: [stepFor('home-clubs')] });
    });
    renderWithProviders(anchored);
    expect(screen.queryByTestId('tour-zone-home-1')).toBeNull();
    expect(screen.getByTestId('pods')).toBeOnTheScreen();
  });

  // The zone wraps its target in a plain View, so an anchor inside a flexed row
  // has to be able to pass its layout on.
  it('passes a style through to the wrapper the highlight is measured from', () => {
    act(() => {
      useToursStore.setState({ activeTourId: 'home', activeSteps: [stepFor('home-pods')] });
    });
    renderWithProviders(
      <TourAnchor tour="home" anchor="home-pods" style={{ flex: 1 }}>
        <Text testID="pods">pods</Text>
      </TourAnchor>,
    );
    expect(screen.getByTestId('tour-zone-home-1')).toHaveStyle({ flex: 1 });
  });
});
