import { screen } from '@testing-library/react-native';

import { ChallengeToolPanels } from '@/components/challenge/tools/ChallengeToolPanels';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

const mockActions = { busy: false, error: '' };
const mockHook = jest.fn((id: string, adopt: (next: PodChallengeView) => void) => {
  void id;
  void adopt;
  return mockActions;
});
jest.mock('@/hooks/useChallengeToolActions', () => ({
  useChallengeToolActions: (id: string, adopt: (next: PodChallengeView) => void) =>
    mockHook(id, adopt),
}));

const stubPanel = (name: string) => ({
  [name]: ({ tool }: { tool: { instance_id: string } }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID={`panel-${tool.instance_id}`}>{name}</Text>;
  },
});
jest.mock('@/components/challenge/tools/PollPanel', () => stubPanel('PollPanel'));
jest.mock('@/components/challenge/tools/QuizPanel', () => stubPanel('QuizPanel'));
jest.mock('@/components/challenge/tools/ItemsPanel', () => stubPanel('ItemsPanel'));
jest.mock('@/components/challenge/tools/SubmissionPanel', () => stubPanel('SubmissionPanel'));
jest.mock('@/components/challenge/tools/BuzzerPanel', () => ({
  ...stubPanel('BuzzerPanel'),
  ...stubPanel('PickPanel'),
}));

const tool = (id: string, kind: string) => ({ instance_id: id, input_kind: kind, label: id });
const challengeOf = (kinds: [string, string][]) =>
  ({ id: 'ch1', tools: kinds.map(([id, kind]) => tool(id, kind)) }) as unknown as PodChallengeView;

beforeEach(() => {
  jest.clearAllMocks();
  mockActions.error = '';
});

describe('ChallengeToolPanels', () => {
  it('gives each run-rather-than-scored tool its own panel, in template order', () => {
    renderWithProviders(
      <ChallengeToolPanels
        challenge={challengeOf([
          ['t1', 'QUIZ'],
          ['t2', 'POLL'],
          ['t3', 'BUZZ'],
          ['t4', 'PICK'],
          ['t5', 'CHECK'],
          ['t6', 'CHECKPOINT'],
          ['t7', 'SUBMIT'],
        ])}
        onChanged={jest.fn()}
      />,
    );
    const shown = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'].map(
      (id) => screen.getByTestId(`panel-${id}`).props.children,
    );
    expect(shown).toEqual([
      'QuizPanel',
      'PollPanel',
      'BuzzerPanel',
      'PickPanel',
      'ItemsPanel',
      'ItemsPanel',
      'SubmissionPanel',
    ]);
  });

  it('skips tools that are scored by hand', () => {
    renderWithProviders(
      <ChallengeToolPanels
        challenge={challengeOf([
          ['clock', 'CLOCK'],
          ['inc', 'INCREMENT'],
          ['t1', 'POLL'],
        ])}
        onChanged={jest.fn()}
      />,
    );
    expect(screen.getByTestId('panel-t1')).toBeOnTheScreen();
    expect(screen.queryByTestId('panel-clock')).toBeNull();
    expect(screen.queryByTestId('panel-inc')).toBeNull();
  });

  it('shows only the kinds asked for', () => {
    renderWithProviders(
      <ChallengeToolPanels
        challenge={challengeOf([
          ['t1', 'POLL'],
          ['t2', 'SUBMIT'],
        ])}
        onChanged={jest.fn()}
        only={['SUBMIT']}
      />,
    );
    expect(screen.queryByTestId('panel-t1')).toBeNull();
    expect(screen.getByTestId('panel-t2')).toBeOnTheScreen();
  });

  it('wires the tool actions to the challenge and its adopt callback', () => {
    const onChanged = jest.fn();
    renderWithProviders(
      <ChallengeToolPanels challenge={challengeOf([['t1', 'POLL']])} onChanged={onChanged} />,
    );
    expect(mockHook).toHaveBeenCalledWith('ch1', onChanged);
  });

  it('shows a failure once at the top for tools whose panels do not show it', () => {
    mockActions.error = 'Voting closed';
    renderWithProviders(
      <ChallengeToolPanels challenge={challengeOf([['t1', 'POLL']])} onChanged={jest.fn()} />,
    );
    expect(screen.getByText('Voting closed')).toBeOnTheScreen();
  });

  it('leaves the failure to the submission panel when there is one', () => {
    mockActions.error = 'Upload refused';
    renderWithProviders(
      <ChallengeToolPanels challenge={challengeOf([['t1', 'SUBMIT']])} onChanged={jest.fn()} />,
    );
    expect(screen.queryByText('Upload refused')).toBeNull();
  });

  it('shows no failure notice when there is none', () => {
    renderWithProviders(
      <ChallengeToolPanels challenge={challengeOf([['t1', 'POLL']])} onChanged={jest.fn()} />,
    );
    expect(screen.queryByText('Voting closed')).toBeNull();
  });
});
