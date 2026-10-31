import { Text, View } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { useAppActive } from '@/hooks/useAppActive';
import type { OccasionLook } from '@/hooks/useOccasionLook';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { getItem, removeItem, setItem } from '@/services/secure-storage';
import { renderWithProviders } from '@/utils/test-utils';
import { OccasionLayer } from '../OccasionLayer';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/useReduceMotion', () => ({ useReduceMotion: jest.fn(() => false) }));
jest.mock('@/hooks/useAppActive', () => ({ useAppActive: jest.fn(() => true) }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
// The decoration has its own spec; here it only reports that it is drawn and whether it may move.
const mockEffects = jest.fn<void, [{ running: boolean }]>();
let mockCrash = false;
jest.mock('../OccasionEffects', () => ({
  OccasionEffects: (props: { running: boolean }) => {
    mockEffects(props);
    if (mockCrash) throw new Error('bad path data');
    return null;
  },
}));

const mockedReduce = jest.mocked(useReduceMotion);
const mockedActive = jest.mocked(useAppActive);
const mockedGet = jest.mocked(getItem);
const mockedSet = jest.mocked(setItem);
const mockedRemove = jest.mocked(removeItem);

const look = (key: string, overrides: Partial<OccasionLook> = {}): OccasionLook => ({
  key,
  color_mode: 'AUTO',
  greeting: '',
  palette_light: {},
  palette_dark: {},
  particles: [],
  flyers: [],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: 'STRING_LIGHTS', colors: [] },
  ...overrides,
});

const lastRunning = () => mockEffects.mock.lastCall?.[0].running;
const drawn = () => mockEffects.mock.calls.length > 0;
const pauseButton = () => screen.queryByTestId('occasion-pause');
/** Native readers get `accessibilityState`; Native Web reads `aria-pressed` — either says it. */
const pressed = () => {
  const { props } = screen.getByTestId('occasion-pause');
  return props.accessibilityState?.selected === true || props['aria-pressed'] === true;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCrash = false;
  mockedReduce.mockReturnValue(false);
  mockedActive.mockReturnValue(true);
  mockedGet.mockResolvedValue(null);
  mockedSet.mockResolvedValue(undefined);
  mockedRemove.mockResolvedValue(undefined);
});

describe('OccasionLayer', () => {
  it('draws nothing for the house look', () => {
    renderWithProviders(<OccasionLayer look={null} greet />);
    expect(drawn()).toBe(false);
    expect(pauseButton()).toBeNull();
  });

  it('holds the decoration still until the pause choice is read, then plays it', async () => {
    renderWithProviders(<OccasionLayer look={look('christmas')} greet={false} />);
    expect(lastRunning()).toBe(false);
    await waitFor(() => expect(lastRunning()).toBe(true));
    expect(screen.getByRole('button', { name: 'ui.occasion.pause' })).toBeOnTheScreen();
    expect(pressed()).toBe(false);
  });

  it('pauses the celebration and plays it again, remembering the choice for the look', async () => {
    renderWithProviders(<OccasionLayer look={look('diwali')} greet={false} />);
    await waitFor(() => expect(pauseButton()).not.toBeNull());

    fireEvent.press(screen.getByTestId('occasion-pause'));
    expect(lastRunning()).toBe(false);
    expect(screen.getByRole('button', { name: 'ui.occasion.play' })).toBeOnTheScreen();
    expect(pressed()).toBe(true);
    expect(mockedSet).toHaveBeenCalledWith('duncit.occasion.paused.diwali', '1');

    fireEvent.press(screen.getByTestId('occasion-pause'));
    expect(lastRunning()).toBe(true);
    expect(mockedRemove).toHaveBeenCalledWith('duncit.occasion.paused.diwali');
  });

  it('stays paused for a look the viewer paused before', async () => {
    mockedGet.mockResolvedValue('1');
    renderWithProviders(<OccasionLayer look={look('holi')} greet={false} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ui.occasion.play' })).toBeOnTheScreen(),
    );
    expect(lastRunning()).toBe(false);
  });

  it('shows the decoration still, with nothing to pause, under Reduce Motion', async () => {
    mockedReduce.mockReturnValue(true);
    renderWithProviders(<OccasionLayer look={look('eid')} greet={false} />);
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(drawn()).toBe(true);
    expect(lastRunning()).toBe(false);
    expect(pauseButton()).toBeNull();
  });

  it('stops the clock while the app is in the background', async () => {
    mockedActive.mockReturnValue(false);
    renderWithProviders(<OccasionLayer look={look('onam')} greet={false} />);
    await waitFor(() => expect(pauseButton()).not.toBeNull());
    expect(lastRunning()).toBe(false);
  });

  it('owes no pause control to a look that does not move', async () => {
    renderWithProviders(
      <OccasionLayer
        look={look('republic-day', {
          garland: { style: 'BUNTING', colors: [] },
          overlays: [{ style: 'VIGNETTE', color: '#000000', opacity: 0.3 }],
        })}
        greet={false}
      />,
    );
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(drawn()).toBe(true);
    expect(pauseButton()).toBeNull();
  });

  it('greets only once the splash has lifted, and draws nothing for a look with no decoration', () => {
    const plain = look('pongal', {
      garland: { style: 'NONE', colors: [] },
      greeting: 'Happy Pongal!',
    });
    renderWithProviders(<OccasionLayer look={plain} greet={false} />);
    expect(screen.queryByText('Happy Pongal!')).toBeNull();
    expect(drawn()).toBe(false);

    screen.rerender(<OccasionLayer look={plain} greet />);
    expect(screen.getByText('Happy Pongal!')).toBeOnTheScreen();
  });

  it('logs a crash in the decoration and drops it, leaving the app and the next look alone', async () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockCrash = true;
    const app = (current: OccasionLook) => (
      <View>
        <Text>Home feed</Text>
        <OccasionLayer look={current} greet={false} />
      </View>
    );
    renderWithProviders(app(look('halloween')));

    expect(screen.getByText('Home feed')).toBeOnTheScreen();
    expect(mockEffects).toHaveBeenCalled();
    expect(pauseButton()).toBeNull();
    expect(logs.mobileApp.error).toHaveBeenCalledWith(
      'occasion',
      'OccasionBoundary',
      expect.objectContaining({ error: expect.objectContaining({ message: 'bad path data' }) }),
    );

    mockCrash = false;
    screen.rerender(app(look('christmas-eve')));
    await waitFor(() => expect(pauseButton()).not.toBeNull());
    expect(lastRunning()).toBe(true);
    quiet.mockRestore();
  });
});
