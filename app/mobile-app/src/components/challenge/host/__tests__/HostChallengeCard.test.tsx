import { fireEvent, screen } from '@testing-library/react-native';

import { HostChallengeCard } from '@/components/challenge/host/HostChallengeCard';
import { useHostChallengeActions } from '@/hooks/useHostChallengeActions';
import { usePodChallengeLive } from '@/hooks/usePodChallengeLive';
import { shareChallenge } from '@/utils/share';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/usePodChallengeLive', () => ({ usePodChallengeLive: jest.fn() }));
jest.mock('@/hooks/useHostChallengeActions', () => ({ useHostChallengeActions: jest.fn() }));
jest.mock('@/utils/share', () => ({ shareChallenge: jest.fn().mockResolvedValue(undefined) }));

const stub = (name: string) =>
  function Stub() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID={`stub-${name}`}>{name}</Text>;
  };
jest.mock('@/components/challenge/host/HostChallengeControls', () => ({
  HostChallengeControls: stub('controls'),
}));
jest.mock('@/components/challenge/host/HostChallengeFinish', () => ({
  HostChallengeFinish: stub('finish'),
}));
jest.mock('@/components/challenge/host/HostChallengeLive', () => ({
  HostChallengeLive: ({ receivedAt }: { receivedAt: number }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="stub-live">{`live@${receivedAt}`}</Text>;
  },
}));
jest.mock('@/components/challenge/host/HostChallengeLog', () => ({
  HostChallengeLog: stub('log'),
}));
const mockPanels = jest.fn();
jest.mock('@/components/challenge/tools/ChallengeToolPanels', () => ({
  ChallengeToolPanels: (props: Record<string, unknown>) => {
    mockPanels(props);
    return null;
  },
}));
jest.mock('@/components/challenge/host/RosterSheet', () => ({
  RosterSheet: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID="stub-roster" onPress={onClose}>
        <Text>{open ? 'roster-open' : 'roster-closed'}</Text>
      </Pressable>
    );
  },
}));

const liveMock = jest.mocked(usePodChallengeLive);
const actionsMock = jest.mocked(useHostChallengeActions);
const adopt = jest.fn();

const challengeOf = (patch: Record<string, unknown> = {}) => ({
  id: 'ch1',
  pod_id: 'pod1',
  name: 'Derby',
  status: 'LIVE',
  eligibility_warning: false,
  competitors: [{}, {}, {}],
  tools: [],
  ...patch,
});

const mount = (challenge: unknown, actionsError = '', onOpenArena = jest.fn()) => {
  liveMock.mockReturnValue({ challenge, receivedAt: 555, adopt } as unknown as ReturnType<
    typeof usePodChallengeLive
  >);
  actionsMock.mockReturnValue({ error: actionsError } as unknown as ReturnType<
    typeof useHostChallengeActions
  >);
  renderWithProviders(<HostChallengeCard challengeId="ch1" onOpenArena={onOpenArena} />);
  return { onOpenArena };
};

beforeEach(() => jest.clearAllMocks());

describe('HostChallengeCard', () => {
  it('draws nothing until the challenge arrives, and wires the hooks to its id', () => {
    mount(null);
    expect(screen.queryByTestId('host-challenge-ch1')).toBeNull();
    expect(liveMock).toHaveBeenCalledWith('ch1');
    expect(actionsMock).toHaveBeenCalledWith('ch1', adopt);
  });

  it('shows the name, the localised status and the controls', () => {
    mount(challengeOf());
    expect(screen.getByRole('heading', { name: 'Derby' })).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.status.LIVE')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-controls')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-finish')).toBeOnTheScreen();
  });

  it('shows an unknown status as it is', () => {
    mount(challengeOf({ status: 'WEIRD' }));
    expect(screen.getByText('WEIRD')).toBeOnTheScreen();
  });

  it('warns when the host is not eligible', () => {
    mount(challengeOf({ eligibility_warning: true }));
    expect(screen.getByText('mweb.challenge.eligibilityWarning')).toBeOnTheScreen();
  });

  it('shows no eligibility warning otherwise', () => {
    mount(challengeOf());
    expect(screen.queryByText('mweb.challenge.eligibilityWarning')).toBeNull();
  });

  it('shows the reason an action failed', () => {
    mount(challengeOf(), 'Pod is closed');
    expect(screen.getByText('Pod is closed')).toBeOnTheScreen();
  });

  it('opens and closes the roster sheet from the roster button, which counts competitors', () => {
    mount(challengeOf());
    expect(screen.getByText('mweb.challenge.rosterButton|3')).toBeOnTheScreen();
    expect(screen.getByText('roster-closed')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-challenge-roster-ch1'));
    expect(screen.getByText('roster-open')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('stub-roster'));
    expect(screen.getByText('roster-closed')).toBeOnTheScreen();
  });

  it.each(['COMPLETED', 'ARCHIVED', 'CANCELLED'])('locks the roster once %s', (status) => {
    mount(challengeOf({ status }));
    expect(screen.getByTestId('host-challenge-roster-ch1')).toBeDisabled();
  });

  it('keeps the roster editable while scheduled or live', () => {
    mount(challengeOf({ status: 'SCHEDULED' }));
    expect(screen.getByTestId('host-challenge-roster-ch1')).toBeEnabled();
  });

  it('opens the arena and shares the challenge', () => {
    const { onOpenArena } = mount(challengeOf());
    fireEvent.press(screen.getByTestId('host-challenge-arena-ch1'));
    expect(onOpenArena).toHaveBeenCalledWith('pod1', 'ch1');
    fireEvent.press(screen.getByTestId('host-challenge-share-ch1'));
    expect(shareChallenge).toHaveBeenCalledWith('pod1', 'ch1', 'Derby');
  });

  it.each(['LIVE', 'PAUSED'])(
    'shows live scoring while %s, fed the time the answer arrived',
    (status) => {
      mount(challengeOf({ status }));
      expect(screen.getByTestId('stub-live')).toHaveTextContent('live@555');
    },
  );

  it.each(['SCHEDULED', 'COMPLETED', 'DRAFT'])('shows no live scoring while %s', (status) => {
    mount(challengeOf({ status }));
    expect(screen.queryByTestId('stub-live')).toBeNull();
  });

  it.each(['LIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])('shows the score log while %s', (status) => {
    mount(challengeOf({ status }));
    expect(screen.getByText('mweb.challenge.scoreLog')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-log')).toBeOnTheScreen();
  });

  it.each(['DRAFT', 'SCHEDULED', 'CANCELLED'])('shows no score log while %s', (status) => {
    mount(challengeOf({ status }));
    expect(screen.queryByTestId('stub-log')).toBeNull();
  });

  it('shows the submission gallery from scheduling on, for a challenge with a submission tool', () => {
    mount(challengeOf({ status: 'SCHEDULED', tools: [{ input_kind: 'SUBMIT' }] }));
    expect(mockPanels).toHaveBeenCalledWith(
      expect.objectContaining({ only: ['SUBMIT'], onChanged: adopt }),
    );
  });

  it.each(['DRAFT', 'CANCELLED'])('hides the submission gallery while %s', (status) => {
    mount(challengeOf({ status, tools: [{ input_kind: 'SUBMIT' }] }));
    expect(mockPanels).not.toHaveBeenCalled();
  });

  it('hides the submission gallery when there is no submission tool', () => {
    mount(challengeOf({ tools: [{ input_kind: 'POLL' }] }));
    expect(mockPanels).not.toHaveBeenCalled();
  });
});
