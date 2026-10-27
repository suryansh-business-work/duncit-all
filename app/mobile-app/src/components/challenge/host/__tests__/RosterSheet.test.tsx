import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RosterSheet } from '@/components/challenge/host/RosterSheet';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { usePodAttendeeNames } from '@/hooks/usePodAttendeeNames';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@duncit/user-core', () => ({
  ...jest.requireActual('@duncit/user-core'),
  makeDeviceId: () => 'device-id-ABCD1234',
}));
jest.mock('@/hooks/usePodAttendeeNames', () => ({ usePodAttendeeNames: jest.fn() }));

const attendeesMock = jest.mocked(usePodAttendeeNames);

const challengeOf = (patch: Record<string, unknown> = {}) =>
  ({
    pod_id: 'pod1',
    participant_mode: 'INDIVIDUAL',
    competitors: [
      { competitor_id: 'c1', name: 'Asha', user_id: 'u1' },
      { competitor_id: 'c2', name: 'Walk-in', user_id: null },
    ],
    ...patch,
  }) as unknown as PodChallengeView;

const actionsOf = (patch: Record<string, unknown> = {}) =>
  ({
    busy: false,
    error: '',
    roster: jest.fn().mockResolvedValue(true),
    ...patch,
  }) as unknown as HostChallengeActions & { roster: jest.Mock };

const mount = (
  challenge = challengeOf(),
  actions = actionsOf(),
  open = true,
  onClose = jest.fn(),
) => {
  const ui = (isOpen: boolean) => (
    <RosterSheet open={isOpen} challenge={challenge} actions={actions} onClose={onClose} />
  );
  const view = renderWithProviders(ui(open));
  return { actions, onClose, rerender: (isOpen: boolean) => view.rerender(ui(isOpen)) };
};

const press = async (testID: string) =>
  act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });

beforeEach(() => {
  jest.clearAllMocks();
  attendeesMock.mockReturnValue({ attendees: [], error: '' });
});

describe('RosterSheet — what shows', () => {
  it('fills the rows from the challenge competitors and marks the one linked to an attendee', () => {
    mount();
    expect(screen.getByDisplayValue('Asha')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Walk-in')).toBeOnTheScreen();
    expect(screen.getAllByText('mweb.challenge.fields.attendee')).toHaveLength(1);
  });

  it('titles the sheet for competitors, or for teams in team mode', () => {
    mount();
    expect(screen.getByText('mweb.challenge.competitors')).toBeOnTheScreen();
  });

  it('titles the sheet for teams in team mode', () => {
    mount(challengeOf({ participant_mode: 'TEAM' }));
    expect(screen.getByText('mweb.challenge.teams')).toBeOnTheScreen();
  });

  it('loads attendees only for an open sheet of individual competitors', () => {
    mount(challengeOf(), actionsOf(), true);
    expect(attendeesMock).toHaveBeenLastCalledWith('pod1', true);
  });

  it('does not load attendees in team mode or while closed', () => {
    mount(challengeOf({ participant_mode: 'TEAM' }));
    expect(attendeesMock).toHaveBeenLastCalledWith('pod1', false);
    mount(challengeOf(), actionsOf(), false);
    expect(attendeesMock).toHaveBeenLastCalledWith('pod1', false);
  });

  it('offers only attendees who are not already linked', () => {
    attendeesMock.mockReturnValue({
      attendees: [
        { user_id: 'u1', name: 'Asha' },
        { user_id: 'u2', name: 'Bo' },
      ],
      error: '',
    });
    mount();
    expect(screen.getByText('mweb.challenge.addFromAttendees')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bo')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Asha')).toBeNull();
  });

  it('hides the attendee picker when everyone is linked or none attended', () => {
    mount();
    expect(screen.queryByText('mweb.challenge.addFromAttendees')).toBeNull();
  });

  it('says why attendees could not be loaded', () => {
    attendeesMock.mockReturnValue({ attendees: [], error: 'Attendees offline' });
    mount();
    expect(screen.getByText('Attendees offline')).toBeOnTheScreen();
  });

  it('shows the reason a save was refused', () => {
    mount(challengeOf(), actionsOf({ error: 'Pod is closed' }));
    expect(screen.getByText('Pod is closed')).toBeOnTheScreen();
  });

  it('shows the sheet content only while open', () => {
    mount(challengeOf(), actionsOf(), false);
    expect(screen.queryByTestId('challenge-roster-add')).toBeNull();
  });
});

describe('RosterSheet — editing the roster', () => {
  it('adds an empty row for a typed-in competitor', async () => {
    mount();
    await press('challenge-roster-add');
    expect(screen.getAllByLabelText('mweb.challenge.fields.name')).toHaveLength(3);
  });

  it('adds an attendee linked to their account, with the name capped', async () => {
    const long = 'N'.repeat(80);
    attendeesMock.mockReturnValue({ attendees: [{ user_id: 'u2', name: long }], error: '' });
    const { actions } = mount();
    await act(async () => {
      fireEvent.press(screen.getByLabelText(long));
    });
    expect(screen.getByDisplayValue('N'.repeat(60))).toBeOnTheScreen();
    await press('challenge-roster-save');
    await waitFor(() => expect(actions.roster).toHaveBeenCalled());
    expect(actions.roster.mock.calls[0][0].competitors.at(-1)).toEqual({
      competitor_id: 'ABCD1234',
      name: 'N'.repeat(60),
      user_id: 'u2',
    });
  });

  it('removes a row', async () => {
    mount();
    await press('challenge-roster-remove-0');
    expect(screen.queryByDisplayValue('Asha')).toBeNull();
    expect(screen.getByDisplayValue('Walk-in')).toBeOnTheScreen();
  });

  it('puts the saved roster back when the sheet is opened again', async () => {
    const view = mount();
    await press('challenge-roster-remove-0');
    expect(screen.queryByDisplayValue('Asha')).toBeNull();
    view.rerender(false);
    view.rerender(true);
    expect(await screen.findByDisplayValue('Asha')).toBeOnTheScreen();
  });
});

describe('RosterSheet — saving', () => {
  it('sends trimmed names with blank ids as null, then closes', async () => {
    const challenge = challengeOf({
      competitors: [
        { competitor_id: 'c1', name: 'Asha', user_id: 'u1' },
        { competitor_id: '', name: '  Walk-in  ', user_id: null },
      ],
    });
    const { actions, onClose } = mount(challenge);
    fireEvent.changeText(screen.getByDisplayValue('  Walk-in  '), '  Dev  ');
    await press('challenge-roster-save');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(actions.roster).toHaveBeenCalledWith({
      competitors: [
        { competitor_id: 'c1', name: 'Asha', user_id: 'u1' },
        { competitor_id: null, name: 'Dev', user_id: null },
      ],
    });
  });

  it('stays open when the server refuses the roster', async () => {
    const { actions, onClose } = mount(
      challengeOf(),
      actionsOf({ roster: jest.fn().mockResolvedValue(false) }),
    );
    await press('challenge-roster-save');
    await waitFor(() => expect(actions.roster).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays open without an unhandled rejection when the save call itself throws', async () => {
    const { actions, onClose } = mount(
      challengeOf(),
      actionsOf({ roster: jest.fn().mockRejectedValue(new Error('network down')) }),
    );
    await press('challenge-roster-save');
    await waitFor(() => expect(actions.roster).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('challenge-roster-save')).toBeOnTheScreen();
  });

  it('refuses a blank name and says so', async () => {
    const { actions } = mount();
    fireEvent.changeText(screen.getByDisplayValue('Walk-in'), '   ');
    await press('challenge-roster-save');
    expect(await screen.findByText('mweb.challenge.errors.name')).toBeOnTheScreen();
    expect(actions.roster).not.toHaveBeenCalled();
  });

  it('refuses an empty roster and says so', async () => {
    const { actions } = mount();
    await press('challenge-roster-remove-1');
    await press('challenge-roster-remove-0');
    await press('challenge-roster-save');
    expect(await screen.findByText('mweb.challenge.errors.noCompetitors')).toBeOnTheScreen();
    expect(actions.roster).not.toHaveBeenCalled();
  });

  it('closes on cancel without saving', async () => {
    const { actions, onClose } = mount();
    await press('challenge-roster-cancel');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(actions.roster).not.toHaveBeenCalled();
  });
});
