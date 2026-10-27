import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ChallengeBallots } from '@/components/challenge/ChallengeBallots';
import {
  CastPodChallengeVoteDocument,
  RatePodChallengeCompetitorDocument,
} from '@/graphql/challenges';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const competitors = [
  { competitor_id: 'c1', name: 'Team Red' },
  { competitor_id: 'c2', name: 'Team Blue' },
];

const tool = (over: Record<string, unknown> = {}) =>
  ({
    instance_id: 'tool-1',
    label: 'Crowd favourite',
    voting_open: true,
    input_kind: 'VOTE',
    config_json: '{}',
    ...over,
  }) as never;

const challenge = (myVotes: unknown[] = []) =>
  ({
    id: 'ch-1',
    competitors,
    viewer: { my_votes: myVotes },
  }) as never;

const updated = { id: 'ch-1', revision: 9 };

beforeEach(() => mockRequest.mockReset());

describe('ChallengeBallots', () => {
  it('says voting is closed instead of showing ballots', () => {
    renderWithProviders(
      <ChallengeBallots
        challenge={challenge()}
        tool={tool({ voting_open: false })}
        onChanged={jest.fn()}
      />,
    );
    expect(screen.getByText('Crowd favourite: voting is closed right now.')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-ballot-tool-1')).toBeNull();
  });

  it('casts a vote and hands the updated challenge up', async () => {
    mockRequest.mockResolvedValue({ castPodChallengeVote: updated });
    const onChanged = jest.fn();
    renderWithProviders(
      <ChallengeBallots challenge={challenge()} tool={tool()} onChanged={onChanged} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-vote-c2'));
    });
    expect(mockRequest.mock.calls[0][0]).toBe(CastPodChallengeVoteDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({
      id: 'ch-1',
      toolInstanceId: 'tool-1',
      candidateId: 'c2',
    });
    expect(mockRequest.mock.calls[0][2]).toEqual({ auth: true });
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated));
  });

  it('labels the candidate already chosen as voted and the rest as votable', () => {
    renderWithProviders(
      <ChallengeBallots
        challenge={challenge([{ tool_instance_id: 'tool-1', candidate_id: 'c1', value: 1 }])}
        tool={tool()}
        onChanged={jest.fn()}
      />,
    );
    expect(screen.getByText('Voted for Team Red')).toBeOnTheScreen();
    expect(screen.getByText('Vote for Team Blue')).toBeOnTheScreen();
  });

  it('ignores a ballot recorded for another tool of the same challenge', () => {
    renderWithProviders(
      <ChallengeBallots
        challenge={challenge([{ tool_instance_id: 'tool-2', candidate_id: 'c1', value: 1 }])}
        tool={tool()}
        onChanged={jest.fn()}
      />,
    );
    expect(screen.getByText('Vote for Team Red')).toBeOnTheScreen();
    expect(screen.queryByText('Voted for Team Red')).toBeNull();
  });

  it('shows the server reason when a vote is refused', async () => {
    mockRequest.mockRejectedValue(new Error('Voting is closed for this tool'));
    const onChanged = jest.fn();
    renderWithProviders(
      <ChallengeBallots challenge={challenge()} tool={tool()} onChanged={onChanged} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-vote-c1'));
    });
    expect(await screen.findByText('Voting is closed for this tool')).toBeOnTheScreen();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('rates a competitor on the configured scale', async () => {
    mockRequest.mockResolvedValue({ ratePodChallengeCompetitor: updated });
    const onChanged = jest.fn();
    renderWithProviders(
      <ChallengeBallots
        challenge={challenge()}
        tool={tool({ input_kind: 'RATING', config_json: '{"scale_max":3}' })}
        onChanged={onChanged}
      />,
    );
    // Three steps for each of two competitors.
    expect(screen.getAllByTestId('attendance-otp-medium-3')).toHaveLength(2);
    expect(screen.queryByTestId('attendance-otp-medium-4')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getAllByTestId('attendance-otp-medium-2').at(1) as never);
    });
    expect(mockRequest.mock.calls[0][0]).toBe(RatePodChallengeCompetitorDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({
      id: 'ch-1',
      toolInstanceId: 'tool-1',
      candidateId: 'c2',
      value: 2,
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated));
  });

  it('defaults the rating scale to five and marks the chosen value', () => {
    renderWithProviders(
      <ChallengeBallots
        challenge={challenge([{ tool_instance_id: 'tool-1', candidate_id: 'c1', value: 4 }])}
        tool={tool({ input_kind: 'RATING' })}
        onChanged={jest.fn()}
      />,
    );
    expect(screen.getAllByTestId('attendance-otp-medium-5')).toHaveLength(2);
    expect(screen.queryByTestId('attendance-otp-medium-6')).toBeNull();
    const fours = screen.getAllByTestId('attendance-otp-medium-4');
    expect(fours[0]?.props['aria-checked'] ?? fours[0]?.props.accessibilityState?.checked).toBe(
      true,
    );
    expect(fours[1]?.props['aria-checked'] ?? fours[1]?.props.accessibilityState?.checked).toBe(
      false,
    );
  });

  it('ignores a second rating tap while the first is still being saved', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mockRequest.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const onChanged = jest.fn();
    renderWithProviders(
      <ChallengeBallots
        challenge={challenge()}
        tool={tool({ input_kind: 'RATING' })}
        onChanged={onChanged}
      />,
    );
    const ones = screen.getAllByTestId('attendance-otp-medium-1');
    await act(async () => {
      fireEvent.press(ones[0] as never);
    });
    await act(async () => {
      fireEvent.press(ones[1] as never);
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ratePodChallengeCompetitor: updated }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
