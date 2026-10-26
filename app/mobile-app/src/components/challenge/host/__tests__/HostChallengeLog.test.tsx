import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HostChallengeLog } from '@/components/challenge/host/HostChallengeLog';
import { PodChallengeScoreLogDocument } from '@/graphql/challenges';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `at ${value}` }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockReasonProps = jest.fn();
jest.mock('@/components/challenge/host/ReasonSheet', () => ({
  ReasonSheet: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    mockReasonProps(props);
    return <Text testID="reason-sheet">{props.open ? 'open' : 'closed'}</Text>;
  },
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const entry = (patch: Record<string, unknown> = {}) => ({
  id: 'e1',
  tool_instance_id: 'tool1',
  competitor_id: 'c1',
  value: 3,
  voided: false,
  void_reason: '',
  created_at: '2026-10-26T10:00:00Z',
  ...patch,
});

const challengeOf = (patch: Record<string, unknown> = {}) =>
  ({
    id: 'ch1',
    status: 'LIVE',
    revision: 1,
    tools: [{ instance_id: 'tool1', label: 'Goals' }],
    competitors: [{ competitor_id: 'c1', name: 'Team Red' }],
    ...patch,
  }) as unknown as PodChallengeView;

const actionsOf = (patch: Record<string, unknown> = {}) =>
  ({
    busy: false,
    voidScore: jest.fn().mockResolvedValue(true),
    ...patch,
  }) as unknown as HostChallengeActions & { voidScore: jest.Mock };

const mount = (challenge = challengeOf(), actions = actionsOf()) => {
  const ui = (c: PodChallengeView) => <HostChallengeLog challenge={c} actions={actions} />;
  const view = renderWithProviders(ui(challenge));
  return { actions, rerender: (c: PodChallengeView) => view.rerender(ui(c)) };
};

const sheet = () => mockReasonProps.mock.calls.at(-1)?.[0];

beforeEach(() => {
  jest.clearAllMocks();
  request.mockResolvedValue({ podChallengeScoreLog: [entry()] });
});

describe('HostChallengeLog', () => {
  it('reads the score log of the challenge and lists each entry with names and time', async () => {
    mount();
    expect(await screen.findByText('mweb.challenge.logEntry|Team Red,Goals,3')).toBeOnTheScreen();
    expect(request).toHaveBeenCalledWith(
      PodChallengeScoreLogDocument,
      { id: 'ch1' },
      { auth: true },
    );
    expect(screen.getByText('at 2026-10-26T10:00:00Z')).toBeOnTheScreen();
  });

  it('says there are no scores yet', async () => {
    request.mockResolvedValue({ podChallengeScoreLog: [] });
    mount();
    expect(await screen.findByText('mweb.challenge.noScores')).toBeOnTheScreen();
  });

  it('shows a dash for a competitor or tool that is no longer on the challenge', async () => {
    request.mockResolvedValue({
      podChallengeScoreLog: [entry({ competitor_id: 'gone', tool_instance_id: 'gone' })],
    });
    mount();
    expect(await screen.findByText('mweb.challenge.logEntry|—,—,3')).toBeOnTheScreen();
  });

  it('reads the log again when the challenge revision moves', async () => {
    const { rerender } = mount();
    await screen.findByText(/logEntry/);
    request.mockResolvedValue({ podChallengeScoreLog: [entry({ value: 9 })] });
    rerender(challengeOf({ revision: 2 }));
    expect(await screen.findByText('mweb.challenge.logEntry|Team Red,Goals,9')).toBeOnTheScreen();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('shows a removed entry with its reason and no remove button', async () => {
    request.mockResolvedValue({
      podChallengeScoreLog: [entry({ voided: true, void_reason: 'Typo' })],
    });
    mount();
    expect(await screen.findByText('mweb.challenge.removed|Typo')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-log-remove-e1')).toBeNull();
    expect(screen.queryByText(/^at /)).toBeNull();
  });

  it('shows a dash when a removed entry has no reason', async () => {
    request.mockResolvedValue({ podChallengeScoreLog: [entry({ voided: true })] });
    mount();
    expect(await screen.findByText('mweb.challenge.removed|—')).toBeOnTheScreen();
  });

  it('disables remove while an action is in flight', async () => {
    mount(challengeOf(), actionsOf({ busy: true }));
    expect(await screen.findByTestId('challenge-log-remove-e1')).toBeDisabled();
  });
});

describe('HostChallengeLog — removing a score', () => {
  it('opens the reason sheet for a live challenge with the optional-reason wording', async () => {
    mount();
    const remove = await screen.findByTestId('challenge-log-remove-e1');
    expect(screen.queryByTestId('reason-sheet')).toBeNull();
    fireEvent.press(remove);
    await screen.findByTestId('reason-sheet');
    expect(sheet()).toMatchObject({
      open: true,
      title: 'mweb.challenge.removeScoreTitle',
      message: 'mweb.challenge.removeScoreBody',
      confirmLabel: 'mweb.challenge.removeScore',
      required: false,
    });
  });

  it('asks for a reason once the challenge has ended, as a correction', async () => {
    mount(challengeOf({ status: 'COMPLETED' }));
    fireEvent.press(await screen.findByTestId('challenge-log-remove-e1'));
    await screen.findByTestId('reason-sheet');
    expect(sheet()).toMatchObject({
      required: true,
      message: 'mweb.challenge.removeScoreCorrection',
    });
  });

  it('voids the entry with the reason and closes the sheet', async () => {
    const { actions } = mount();
    fireEvent.press(await screen.findByTestId('challenge-log-remove-e1'));
    await screen.findByTestId('reason-sheet');
    await act(async () => sheet().onSubmit('Wrong player'));
    expect(actions.voidScore).toHaveBeenCalledWith('e1', 'Wrong player');
    await waitFor(() => expect(screen.queryByTestId('reason-sheet')).toBeNull());
  });

  it('voids without a reason when none was typed', async () => {
    const { actions } = mount();
    fireEvent.press(await screen.findByTestId('challenge-log-remove-e1'));
    await screen.findByTestId('reason-sheet');
    await act(async () => sheet().onSubmit(''));
    expect(actions.voidScore).toHaveBeenCalledWith('e1', undefined);
  });

  it('keeps the sheet open when the server refuses', async () => {
    const { actions } = mount(
      challengeOf(),
      actionsOf({ voidScore: jest.fn().mockResolvedValue(false) }),
    );
    fireEvent.press(await screen.findByTestId('challenge-log-remove-e1'));
    await screen.findByTestId('reason-sheet');
    await act(async () => sheet().onSubmit('x'));
    await waitFor(() => expect(actions.voidScore).toHaveBeenCalled());
    expect(screen.getByTestId('reason-sheet')).toBeOnTheScreen();
  });

  it('closes the sheet without voiding when it is dismissed', async () => {
    const { actions } = mount();
    fireEvent.press(await screen.findByTestId('challenge-log-remove-e1'));
    await screen.findByTestId('reason-sheet');
    act(() => sheet().onClose());
    await waitFor(() => expect(screen.queryByTestId('reason-sheet')).toBeNull());
    expect(actions.voidScore).not.toHaveBeenCalled();
  });
});
