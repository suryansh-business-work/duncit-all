import { fireEvent, screen } from '@testing-library/react-native';
import type { IStep } from 'rn-tourguide';

import { TourCard } from '@/tours/TourCard';
import { useToursStore } from '@/stores/tours.store';
import { renderWithProviders } from '@/utils/test-utils';
import { fallbackT } from '@/i18n/fallback';

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const STEPS = [
  { anchor: 'home-pods', titleKey: 'mweb.tours.home.pods.title', bodyKey: 'mweb.tours.home.pods.body' },
  { anchor: 'home-clubs', titleKey: 'mweb.tours.home.clubs.title', bodyKey: 'mweb.tours.home.clubs.body' },
];

/** The step object rn-tourguide hands the tooltip; `order` is the zone number. */
const currentStep = (order: number) =>
  ({ name: String(order), order, text: '', target: null, wrapper: null }) as unknown as IStep;

const handlers = () => ({
  handleNext: jest.fn(),
  handlePrev: jest.fn(),
  handleStop: jest.fn(),
});

beforeEach(() => {
  useToursStore.setState({ activeTourId: 'home', activeSteps: STEPS, mountedAnchors: [] });
});

describe('TourCard', () => {
  it('shows the step’s own copy and its place in the tour', () => {
    renderWithProviders(
      <TourCard currentStep={currentStep(1)} isFirstStep isLastStep={false} {...handlers()} />,
    );
    expect(screen.getByText(fallbackT('mweb.tours.home.pods.title'))).toBeOnTheScreen();
    expect(screen.getByText(fallbackT('mweb.tours.home.pods.body'))).toBeOnTheScreen();
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('1 / 2');
  });

  it('has nowhere to go back to on the first step', () => {
    const on = handlers();
    renderWithProviders(
      <TourCard currentStep={currentStep(1)} isFirstStep isLastStep={false} {...on} />,
    );
    expect(screen.queryByTestId('tour-previous')).toBeNull();
    fireEvent.press(screen.getByTestId('tour-next'));
    expect(on.handleNext).toHaveBeenCalled();
    expect(on.handleStop).not.toHaveBeenCalled();
  });

  // The library's `next` is a no-op on the last step, so Finish has to stop.
  it('finishes rather than advancing past the last step', () => {
    const on = handlers();
    renderWithProviders(
      <TourCard currentStep={currentStep(2)} isFirstStep={false} isLastStep {...on} />,
    );
    expect(screen.getByTestId('tour-next')).toHaveTextContent(fallbackT('mweb.tours.finish'));
    fireEvent.press(screen.getByTestId('tour-next'));
    expect(on.handleStop).toHaveBeenCalled();
    expect(on.handleNext).not.toHaveBeenCalled();
  });

  it('goes back with Previous and ends with Skip', () => {
    const on = handlers();
    renderWithProviders(
      <TourCard currentStep={currentStep(2)} isFirstStep={false} isLastStep={false} {...on} />,
    );
    fireEvent.press(screen.getByTestId('tour-previous'));
    expect(on.handlePrev).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('tour-skip'));
    expect(on.handleStop).toHaveBeenCalled();
  });

  // Finishing clears the store a frame before the overlay unmounts.
  it('renders nothing once the step list is gone', () => {
    useToursStore.setState({ activeSteps: [] });
    renderWithProviders(
      <TourCard currentStep={currentStep(1)} isFirstStep isLastStep {...handlers()} />,
    );
    expect(screen.queryByTestId('tour-card')).toBeNull();
  });
});
