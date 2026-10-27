import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HostChallengeFinish } from '@/components/challenge/host/HostChallengeFinish';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/components/challenge/ChallengeResultCard', () => ({
  ChallengeResultCard: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="result-card">result</Text>;
  },
}));
jest.mock('@/components/challenge/ChallengeStandings', () => ({
  ChallengeStandings: ({ standings }: { standings: unknown[] }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="standings">{`standings:${standings.length}`}</Text>;
  },
}));
const mockReasonProps = jest.fn();
jest.mock('@/components/challenge/host/ReasonSheet', () => ({
  ReasonSheet: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    mockReasonProps(props);
    return <Text testID="reason-sheet">{props.open ? 'open' : 'closed'}</Text>;
  },
}));

const sheet = () => mockReasonProps.mock.calls.at(-1)?.[0];

const challengeOf = (patch: Record<string, unknown> = {}) =>
  ({
    name: 'Derby',
    status: 'LIVE',
    result: null,
    standings: [{ competitor_id: 'c1' }],
    viewer: { is_staff: false },
    ...patch,
  }) as unknown as PodChallengeView;

const actionsOf = (patch: Record<string, unknown> = {}) =>
  ({
    busy: false,
    notify: jest.fn().mockResolvedValue(true),
    publish: jest.fn().mockResolvedValue(true),
    ...patch,
  }) as unknown as HostChallengeActions & { notify: jest.Mock; publish: jest.Mock };

const mount = (challenge = challengeOf(), actions = actionsOf()) => {
  renderWithProviders(<HostChallengeFinish challenge={challenge} actions={actions} />);
  return actions;
};

beforeEach(() => jest.clearAllMocks());

describe('HostChallengeFinish — notifications', () => {
  it.each(['LIVE', 'PAUSED'])('sends the live link now while %s', (status) => {
    const actions = mount(challengeOf({ status }));
    expect(screen.getByText('mweb.challenge.sendLiveNow')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-notify-send'));
    fireEvent.press(screen.getByTestId('challenge-notify-retry'));
    expect(actions.notify).toHaveBeenNthCalledWith(1, 'LIVE', false);
    expect(actions.notify).toHaveBeenNthCalledWith(2, 'LIVE', true);
  });

  it('offers the result link once there is a result, whatever the status', () => {
    const actions = mount(challengeOf({ status: 'ARCHIVED', result: { id: 'r1' } }));
    expect(screen.getByText('mweb.challenge.sendResultNow')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-notify-send'));
    fireEvent.press(screen.getByTestId('challenge-notify-retry'));
    expect(actions.notify).toHaveBeenNthCalledWith(1, 'RESULT', false);
    expect(actions.notify).toHaveBeenNthCalledWith(2, 'RESULT', true);
  });

  it('offers no link before play starts or after play ends without a result', () => {
    mount(challengeOf({ status: 'SCHEDULED' }));
    expect(screen.queryByTestId('challenge-notify-send')).toBeNull();
  });

  it('offers no link after play ends without a result either', () => {
    mount(challengeOf({ status: 'COMPLETED' }));
    expect(screen.queryByTestId('challenge-notify-send')).toBeNull();
  });

  it('disables the link buttons while an action is in flight', () => {
    mount(challengeOf(), actionsOf({ busy: true }));
    expect(screen.getByTestId('challenge-notify-send')).toBeDisabled();
    expect(screen.getByTestId('challenge-notify-retry')).toBeDisabled();
  });
});

describe('HostChallengeFinish — publishing the result', () => {
  it('shows the standings for review and publishes only after confirming', async () => {
    const actions = mount(challengeOf({ status: 'COMPLETED' }));
    expect(screen.getByText('mweb.challenge.reviewBeforePublish')).toBeOnTheScreen();
    expect(screen.getByTestId('standings')).toHaveTextContent('standings:1');
    expect(screen.queryByTestId('result-card')).toBeNull();
    fireEvent.press(screen.getByTestId('challenge-publish'));
    expect(await screen.findByText('mweb.challenge.publishBody|Derby')).toBeOnTheScreen();
    expect(actions.publish).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-publish-confirm-confirm'));
    });
    await waitFor(() => expect(actions.publish).toHaveBeenCalledWith());
    await waitFor(() => expect(screen.queryByText('mweb.challenge.publishBody|Derby')).toBeNull());
  });

  it('backs out of publishing without publishing', async () => {
    const actions = mount(challengeOf({ status: 'COMPLETED' }));
    fireEvent.press(screen.getByTestId('challenge-publish'));
    await screen.findByText('mweb.challenge.publishBody|Derby');
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-publish-confirm-cancel'));
    });
    expect(actions.publish).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('mweb.challenge.publishBody|Derby')).toBeNull());
  });

  it('cannot publish a challenge nobody scored', () => {
    mount(challengeOf({ status: 'COMPLETED', standings: [] }));
    expect(screen.getByTestId('challenge-publish')).toBeDisabled();
  });

  it('cannot publish while an action is in flight', () => {
    mount(challengeOf({ status: 'COMPLETED' }), actionsOf({ busy: true }));
    expect(screen.getByTestId('challenge-publish')).toBeDisabled();
  });

  it('offers no publish while the challenge is still being played', () => {
    mount(challengeOf({ status: 'LIVE' }));
    expect(screen.queryByTestId('challenge-publish')).toBeNull();
    expect(screen.queryByTestId('standings')).toBeNull();
  });
});

describe('HostChallengeFinish — correcting a published result', () => {
  const published = { status: 'COMPLETED', result: { id: 'r1' } };

  it('shows the result card, and the correction button only to staff', () => {
    mount(challengeOf({ ...published, viewer: { is_staff: true } }));
    expect(screen.getByTestId('result-card')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-correct')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-publish')).toBeNull();
  });

  it('hides the correction button from a host who is not staff', () => {
    mount(challengeOf(published));
    expect(screen.getByTestId('result-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-correct')).toBeNull();
  });

  it('opens the reason sheet, requiring a reason', async () => {
    mount(challengeOf({ ...published, viewer: { is_staff: true } }));
    expect(sheet()).toMatchObject({ open: false, required: true });
    fireEvent.press(screen.getByTestId('challenge-correct'));
    await waitFor(() => expect(sheet().open).toBe(true));
    expect(sheet()).toMatchObject({
      title: 'mweb.challenge.publishCorrection',
      message: 'mweb.challenge.correctionBody',
      confirmLabel: 'mweb.challenge.publish',
    });
  });

  it('publishes the correction with the reason and closes the sheet', async () => {
    const actions = mount(challengeOf({ ...published, viewer: { is_staff: true } }));
    fireEvent.press(screen.getByTestId('challenge-correct'));
    await waitFor(() => expect(sheet().open).toBe(true));
    await act(async () => sheet().onSubmit('Miscounted'));
    expect(actions.publish).toHaveBeenCalledWith('Miscounted');
    await waitFor(() => expect(sheet().open).toBe(false));
  });

  it('keeps the sheet open when the server refuses the correction', async () => {
    const actions = mount(
      challengeOf({ ...published, viewer: { is_staff: true } }),
      actionsOf({ publish: jest.fn().mockResolvedValue(false) }),
    );
    fireEvent.press(screen.getByTestId('challenge-correct'));
    await waitFor(() => expect(sheet().open).toBe(true));
    await act(async () => sheet().onSubmit('Miscounted'));
    await waitFor(() => expect(actions.publish).toHaveBeenCalled());
    expect(sheet().open).toBe(true);
  });

  it('closes the sheet without publishing when dismissed', async () => {
    const actions = mount(challengeOf({ ...published, viewer: { is_staff: true } }));
    fireEvent.press(screen.getByTestId('challenge-correct'));
    await waitFor(() => expect(sheet().open).toBe(true));
    act(() => sheet().onClose());
    await waitFor(() => expect(sheet().open).toBe(false));
    expect(actions.publish).not.toHaveBeenCalled();
  });
});
