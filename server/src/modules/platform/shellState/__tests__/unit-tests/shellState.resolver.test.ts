import type { GraphQLContext } from '@context';
import { shellStateResolvers } from '../../shellState.resolver';
import { shellStateService } from '../../shellState.service';

jest.mock('../../shellState.service', () => ({
  shellStateService: { state: jest.fn(), save: jest.fn() },
}));

const ctx = (user: unknown): GraphQLContext => ({ user }) as GraphQLContext;
const me = { id: 'u-1', roles: ['SUPER_ADMIN'] };

/**
 * The chrome arrangement is every signed-in reader's, not a role's — the only
 * thing the resolver has to get right is that it is scoped to the CALLER, and
 * that an anonymous request is refused rather than answered with somebody's desk.
 */
describe('shellState resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the caller own arrangement', async () => {
    (shellStateService.state as jest.Mock).mockResolvedValue({ agent_edge: 'LEFT' });
    const result = await shellStateResolvers.Query.shellWorkspaceState({}, {}, ctx(me));
    expect(shellStateService.state).toHaveBeenCalledWith('u-1');
    expect(result).toEqual({ agent_edge: 'LEFT' });
  });

  it('saves against the caller, with an empty input when none arrived', async () => {
    (shellStateService.save as jest.Mock).mockResolvedValue({ agent_edge: 'RIGHT' });
    await shellStateResolvers.Mutation.saveShellWorkspaceState(
      {},
      { input: { agent_edge: 'RIGHT' } },
      ctx(me)
    );
    expect(shellStateService.save).toHaveBeenCalledWith('u-1', { agent_edge: 'RIGHT' });

    await shellStateResolvers.Mutation.saveShellWorkspaceState(
      {},
      { input: undefined as never },
      ctx(me)
    );
    expect(shellStateService.save).toHaveBeenLastCalledWith('u-1', {});
  });

  it('refuses an anonymous caller on both fields', () => {
    expect(() => shellStateResolvers.Query.shellWorkspaceState({}, {}, ctx(null))).toThrow(
      /not authenticated/i
    );
    expect(() =>
      shellStateResolvers.Mutation.saveShellWorkspaceState({}, { input: {} }, ctx(null))
    ).toThrow(/not authenticated/i);
  });
});
