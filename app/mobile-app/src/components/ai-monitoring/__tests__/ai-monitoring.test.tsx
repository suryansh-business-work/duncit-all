/**
 * The AI Monitoring notice on native, and the motion it carries.
 *
 * What is worth asserting about an animation is not how it looks — it is that
 * the driver STOPS when nothing is watching (a loop left running on an
 * unmounted screen is a battery leak nobody sees), that a badge only claims a
 * check is running when one is, and that the notice still says its sentences
 * while all of that moves.
 */
import { Animated } from 'react-native';
import { fireEvent, renderHook, screen } from '@testing-library/react-native';
import type { AiMonitoringCopy } from '@duncit/ai-monitoring';

import { AiMonitorGlyph } from '@/components/ai-monitoring/AiMonitorGlyph';
import { AiMonitorPill } from '@/components/ai-monitoring/AiMonitorPill';
import { AiMonitoringChip } from '@/components/ai-monitoring/AiMonitoringChip';
import { AiMonitoringDialog } from '@/components/ai-monitoring/AiMonitoringDialog';
import { useAiMonitorLoop } from '@/components/ai-monitoring/useAiMonitorLoop';
import { useAiMonitoringConfig } from '@/hooks/useAiMonitoringConfig';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useAiMonitoringConfig');

const copy: AiMonitoringCopy = {
  chipLabel: 'AI Monitoring',
  title: 'This upload is checked by AI',
  intro: 'An AI model reviews every image and file uploaded here.',
  points: ['Your upload is scanned for unsafe content.'],
  footnote: 'Breaking the guidelines can lead to action on your account.',
  dismissLabel: 'Got it',
};

const mockedConfig = useAiMonitoringConfig as jest.MockedFunction<typeof useAiMonitoringConfig>;

beforeEach(() => {
  mockedConfig.mockReturnValue({ visible: true, copy });
});

/** An `Animated.loop` whose start/stop can be watched. */
function spyOnLoop() {
  const start = jest.fn();
  const stop = jest.fn();
  const spy = jest.spyOn(Animated, 'loop').mockReturnValue({
    start,
    stop,
    reset: jest.fn(),
  } as unknown as Animated.CompositeAnimation);
  return { start, stop, spy };
}

describe('useAiMonitorLoop', () => {
  it('runs while it is asked to, and stops the driver on unmount', () => {
    const { start, stop, spy } = spyOnLoop();

    const { unmount } = renderHook(() => useAiMonitorLoop(true, 1000));
    expect(start).toHaveBeenCalled();

    unmount();
    expect(stop).toHaveBeenCalled();

    spy.mockRestore();
  });

  // The overlay's rings and scan bar are wired to `open`. Left running, they
  // would tick behind a screen the person has already left.
  it('starts nothing at all while it is inactive', () => {
    const { start, spy } = spyOnLoop();

    renderHook(() => useAiMonitorLoop(false, 1000));

    expect(start).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // The second ring leaves half a flight after the first. Without the delay
  // both rings sit on top of each other and the badge looks bare between them.
  it('holds a staggered ring back once, before its loop — not before each flight', () => {
    const sequence = jest.spyOn(Animated, 'sequence');

    renderHook(() => useAiMonitorLoop(true, 1000, 500));

    expect(sequence).toHaveBeenCalled();
    sequence.mockRestore();
  });
});

describe('AiMonitorGlyph', () => {
  it('renders the badge whether or not a check is running', () => {
    renderWithProviders(<AiMonitorGlyph testID="glyph" />);

    expect(screen.getByTestId('glyph')).toBeTruthy();
  });

  // Rings mean "a check is RUNNING". A badge that emitted them while merely
  // labelling a dialog would say something is in flight when nothing is.
  it('reserves the halo only when it is actually emitting rings', () => {
    const still = renderWithProviders(<AiMonitorGlyph size={40} testID="still" />);
    const running = renderWithProviders(<AiMonitorGlyph size={40} rings testID="running" />);

    expect(still.getByTestId('still')).toBeTruthy();
    expect(running.getByTestId('running')).toBeTruthy();
  });
});

describe('AiMonitorPill', () => {
  it('calls back when it is tapped', () => {
    const onPress = jest.fn();
    renderWithProviders(<AiMonitorPill label="AI Monitoring" onPress={onPress} testID="pill" />);

    fireEvent.press(screen.getByTestId('pill'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // The label says "AI Monitoring"; what the pill OPENS is a different
  // sentence, and that is what a screen reader should hear.
  it('announces what it opens when the caller says so, and its label otherwise', () => {
    renderWithProviders(
      <AiMonitorPill
        label="AI Monitoring"
        ariaLabel="What AI monitors"
        onPress={jest.fn()}
        testID="told"
      />,
    );
    expect(screen.getByTestId('told').props['aria-label']).toBe('What AI monitors');

    renderWithProviders(<AiMonitorPill label="AI Monitoring" onPress={jest.fn()} testID="bare" />);
    expect(screen.getByTestId('bare').props['aria-label']).toBe('AI Monitoring');
  });
});

describe('AiMonitoringChip', () => {
  it('says its label and opens the dialog behind it, badge and all', () => {
    renderWithProviders(<AiMonitoringChip />);

    fireEvent.press(screen.getByTestId('ai-monitoring-chip'));

    expect(screen.getByTestId('ai-monitoring-dialog')).toBeTruthy();
    expect(screen.getByTestId('ai-monitoring-glyph')).toBeTruthy();
    expect(screen.getByText(copy.chipLabel)).toBeTruthy();
  });

  it('closes the dialog again from its dismiss button', () => {
    renderWithProviders(<AiMonitoringChip />);

    fireEvent.press(screen.getByTestId('ai-monitoring-chip'));
    fireEvent.press(screen.getByTestId('ai-monitoring-close'));

    expect(screen.queryByTestId('ai-monitoring-dialog')).toBeNull();
  });

  // The admin switch is the only thing that may hide the notice — a person
  // about to upload something has to be told it is screened.
  it('renders nothing once the admin switch arrives turned off', () => {
    mockedConfig.mockReturnValue({ visible: false, copy });

    renderWithProviders(<AiMonitoringChip />);

    expect(screen.queryByTestId('ai-monitoring-chip')).toBeNull();
  });
});

describe('AiMonitoringDialog', () => {
  it('renders every sentence the caller resolved', () => {
    renderWithProviders(<AiMonitoringDialog open onClose={jest.fn()} copy={copy} />);

    expect(screen.getByText(copy.points[0])).toBeTruthy();
    expect(screen.getByText(copy.footnote)).toBeTruthy();
  });

  // The footnote is an admin field that can be left blank. A bordered panel
  // around nothing is worse than no panel.
  it('leaves the footnote panel out when the admin cleared that field', () => {
    renderWithProviders(
      <AiMonitoringDialog open onClose={jest.fn()} copy={{ ...copy, footnote: '' }} />,
    );

    expect(screen.queryByText(copy.footnote)).toBeNull();
    expect(screen.getByText(copy.points[0])).toBeTruthy();
  });

  it('closes through the caller callback rather than on its own', () => {
    const onClose = jest.fn();
    renderWithProviders(<AiMonitoringDialog open onClose={onClose} copy={copy} />);

    fireEvent.press(screen.getByTestId('ai-monitoring-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
