import { fireEvent, screen } from '@testing-library/react-native';

import { DuncitButton } from '@/components/DuncitButton';
import { PollPanel } from '@/components/challenge/tools/PollPanel';
import type { PanelProps } from '@/components/challenge/tools/ToolCard';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const pollTool = (patch: Record<string, unknown> = {}) =>
  ({
    instance_id: 'p1',
    label: 'Best snack',
    input_kind: 'POLL',
    voting_open: true,
    config_json: JSON.stringify({
      options: [
        { key: 'x', label: 'Samosa' },
        { key: 'y', label: 'Chai' },
      ],
    }),
    state_json: JSON.stringify({ total: 4, tallies: { x: 3, y: 1 } }),
    ...patch,
  }) as unknown as PanelProps['tool'];

const challengeOf = (viewer: Record<string, unknown> = {}) =>
  ({
    id: 'ch1',
    status: 'LIVE',
    competitors: [],
    viewer: { can_interact: true, my_votes: [], ...viewer },
  }) as unknown as PanelProps['challenge'];

const actionsOf = (busy = false) =>
  ({ busy, poll: jest.fn().mockResolvedValue(true) }) as unknown as PanelProps['actions'] & {
    poll: jest.Mock;
  };

const mount = (tool = pollTool(), challenge = challengeOf(), actions = actionsOf()) => {
  renderWithProviders(<PollPanel challenge={challenge} tool={tool} actions={actions} />);
  return actions;
};

describe('PollPanel', () => {
  it('shows every option with its live tally', () => {
    mount();
    expect(screen.getByText('Best snack')).toBeOnTheScreen();
    expect(screen.getByText('Samosa')).toBeOnTheScreen();
    expect(screen.getByText('Chai')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.pollTally|75,3')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.pollTally|25,1')).toBeOnTheScreen();
  });

  it('lets an attendee vote while the poll is open', () => {
    const actions = mount();
    fireEvent.press(screen.getByTestId('challenge-poll-p1-y'));
    expect(actions.poll).toHaveBeenCalledWith('p1', 'y');
    expect(screen.queryByText('mweb.challenge.votingClosed|Best snack')).toBeNull();
  });

  it('disables the vote buttons while an action is in flight', () => {
    mount(pollTool(), challengeOf(), actionsOf(true));
    expect(screen.getByTestId('challenge-poll-p1-x')).toBeDisabled();
  });

  it('shows plain options and no vote buttons to someone who cannot interact', () => {
    mount(pollTool(), challengeOf({ can_interact: false }));
    expect(screen.getByText('Samosa')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-poll-p1-x')).toBeNull();
  });

  it('closes voting: plain options and the closed note, tallies kept', () => {
    mount(pollTool({ voting_open: false }));
    expect(screen.queryByTestId('challenge-poll-p1-x')).toBeNull();
    expect(screen.getByText('mweb.challenge.votingClosed|Best snack')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.pollTally|75,3')).toBeOnTheScreen();
  });

  it('keeps the card even for a poll with no votes yet', () => {
    mount(pollTool({ state_json: '{}' }));
    expect(screen.getAllByText('mweb.challenge.tools.pollTally|0,0')).toHaveLength(2);
  });

  it('takes the viewer own POLL vote into account only for this tool', () => {
    mount(
      pollTool(),
      challengeOf({
        my_votes: [
          { tool_instance_id: 'other', kind: 'POLL', candidate_id: 'x' },
          { tool_instance_id: 'p1', kind: 'POLL', candidate_id: 'y' },
        ],
      }),
    );
    // Both options stay votable (a second tap moves the vote); the chosen one is filled in.
    expect(screen.getByTestId('challenge-poll-p1-x')).toBeEnabled();
    expect(screen.getByTestId('challenge-poll-p1-y')).toBeEnabled();
    expect(screen.UNSAFE_getAllByType(DuncitButton).map((b) => b.props.variant)).toEqual([
      'outline',
      'solid',
    ]);
  });

  it('emphasises the chosen option in the read-only view', () => {
    mount(
      pollTool({ voting_open: false }),
      challengeOf({ my_votes: [{ tool_instance_id: 'p1', kind: 'POLL', candidate_id: 'y' }] }),
    );
    expect(screen.UNSAFE_getByProps({ children: 'Chai' }).props.fontWeight).toBe('700');
    expect(screen.UNSAFE_getByProps({ children: 'Samosa' }).props.fontWeight).toBe('400');
  });
});
