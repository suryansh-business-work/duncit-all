import { act, screen } from '@testing-library/react-native';

import { ChallengeClock } from '@/components/challenge/ChallengeClock';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const NOW = new Date('2026-10-26T10:00:00Z').getTime();

const toolOf = (patch: Record<string, unknown> = {}) =>
  ({
    instance_id: 'k1',
    label: 'Lap time',
    clock_running: false,
    clock_elapsed_ms: 65_000,
    config_json: '{}',
    ...patch,
  }) as unknown as PodChallengeView['tools'][number];

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

describe('ChallengeClock', () => {
  it('shows a stopped stopwatch at the elapsed time the server reported', () => {
    renderWithProviders(<ChallengeClock tool={toolOf()} receivedAt={NOW} />);
    expect(screen.getByText('01:05')).toBeOnTheScreen();
    expect(screen.getByText('Lap time')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lap time: 01:05, mweb.challenge.clockStopped')).toBeOnTheScreen();
  });

  it('does not tick while stopped', () => {
    renderWithProviders(<ChallengeClock tool={toolOf()} receivedAt={NOW} />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('01:05')).toBeOnTheScreen();
  });

  it('counts up every second from the moment the answer arrived while running', () => {
    renderWithProviders(<ChallengeClock tool={toolOf({ clock_running: true })} receivedAt={NOW} />);
    expect(screen.getByText('01:05')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lap time: 01:05, mweb.challenge.clockRunning')).toBeOnTheScreen();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText('01:08')).toBeOnTheScreen();
  });

  it('stops ticking when it is unmounted', () => {
    const view = renderWithProviders(
      <ChallengeClock tool={toolOf({ clock_running: true })} receivedAt={NOW} />,
    );
    view.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('shows the time remaining for a countdown, never below zero', () => {
    renderWithProviders(
      <ChallengeClock
        tool={toolOf({
          clock_running: true,
          clock_elapsed_ms: 50_000,
          config_json: JSON.stringify({ mode: 'COUNTDOWN', duration_seconds: 60 }),
        })}
        receivedAt={NOW}
      />,
    );
    expect(screen.getByText('00:10')).toBeOnTheScreen();
    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(screen.getByText('00:00')).toBeOnTheScreen();
  });

  it('shows a stopwatch over an hour as h:mm:ss', () => {
    renderWithProviders(
      <ChallengeClock tool={toolOf({ clock_elapsed_ms: 3_725_000 })} receivedAt={NOW} />,
    );
    expect(screen.getByText('1:02:05')).toBeOnTheScreen();
  });

  it('renders the large variant', () => {
    renderWithProviders(<ChallengeClock tool={toolOf()} receivedAt={NOW} large />);
    expect(screen.UNSAFE_getByProps({ children: '01:05' }).props.fontSize).toBe(44);
  });

  it('renders the regular size by default', () => {
    renderWithProviders(<ChallengeClock tool={toolOf()} receivedAt={NOW} />);
    expect(screen.UNSAFE_getByProps({ children: '01:05' }).props.fontSize).toBe(20);
  });
});
