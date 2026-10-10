import { challengeRequired } from '@/services/challenge-setup';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockedRequest = graphqlRequest as jest.Mock;
const setup = (over: Record<string, unknown>) => ({
  podChallengeSetup: {
    enabled: true,
    require_challenge: true,
    templates: [{ id: 't1', name: 'Team Match' }],
    ...over,
  },
});

describe('challengeRequired', () => {
  beforeEach(() => mockedRequest.mockReset());

  it('is true when the pod’s category requires a challenge and offers a template', async () => {
    mockedRequest.mockResolvedValue(setup({}));
    await expect(challengeRequired('pod-1')).resolves.toBe(true);
    expect(mockedRequest).toHaveBeenCalledWith(
      expect.anything(),
      { podId: 'pod-1' },
      { auth: true },
    );
  });

  it('is false when challenges are only allowed, are off, or have no template to pick', async () => {
    mockedRequest.mockResolvedValue(setup({ require_challenge: false }));
    await expect(challengeRequired('pod-1')).resolves.toBe(false);
    mockedRequest.mockResolvedValue(setup({ enabled: false }));
    await expect(challengeRequired('pod-1')).resolves.toBe(false);
    mockedRequest.mockResolvedValue(setup({ templates: [] }));
    await expect(challengeRequired('pod-1')).resolves.toBe(false);
  });

  it('never blocks the publish it follows: an unreadable setup means not required', async () => {
    mockedRequest.mockRejectedValue(new Error('Network request failed'));
    await expect(challengeRequired('pod-1')).resolves.toBe(false);
  });
});
