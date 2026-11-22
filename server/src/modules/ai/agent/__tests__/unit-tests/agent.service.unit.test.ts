/**
 * The staff Agent may only do what the matching API mutation would let the
 * same person do: the model plans, the person's roles decide. Clubs need the
 * Clubs console's write roles (createClub); pod drafts go to the asker's own
 * Create Pod, never into somebody else's account.
 */
jest.mock('../../agent.intent', () => ({ planFromMessage: jest.fn() }));
jest.mock('../../agent.clubs', () => ({ createClubBatch: jest.fn() }));
jest.mock('../../agent.resources', () => ({ pickClub: jest.fn(), pickImages: jest.fn() }));
jest.mock('@modules/pods/pod-draft/pod-draft.service', () => ({ podDraftService: { save: jest.fn() } }));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import { planFromMessage } from '../../agent.intent';
import { createClubBatch } from '../../agent.clubs';
import { pickClub, pickImages } from '../../agent.resources';
import { podDraftService } from '@modules/pods/pod-draft/pod-draft.service';
import { CLUB_WRITE_ROLES } from '@modules/clubs/club/club.roles';
import { agentService } from '../../agent.service';

const plan = planFromMessage as jest.Mock;
const clubs = createClubBatch as jest.Mock;
const saveDraft = podDraftService.save as jest.Mock;

const ASKER = '64b7f0c2a1e4c9d3f0a1b2c3';
const REFUSAL = 'You do not have permission to create these, so nothing was made.';

beforeEach(() => {
  (pickClub as jest.Mock).mockResolvedValue({ id: 'club-1', name: 'Runners', minPax: 4 });
  (pickImages as jest.Mock).mockResolvedValue(['https://ik.imagekit.io/duncit/run.jpg']);
  saveDraft.mockImplementation(async () => ({ id: 'draft-1' }));
  clubs.mockResolvedValue([{ kind: 'CLUB', ok: true, id: 'c1', title: 'Chess', detail: 'Created.' }]);
});

describe('agentService.chat — clubs need the Clubs console write roles', () => {
  beforeEach(() => plan.mockResolvedValue({ action: 'CREATE_CLUBS', count: 1, topic: 'Chess', reply: '' }));

  it('lets a city admin create clubs, as createClub does', async () => {
    const result = await agentService.chat({ message: 'Make a chess club' }, { id: ASKER, roles: ['CITY_ADMIN'] });
    expect(clubs).toHaveBeenCalledWith({ count: 1, topic: 'Chess' });
    expect(result).toMatchObject({ action: 'CREATE_CLUBS', requested: 1, created: 1, failed: 0 });
  });

  it('refuses a zonal admin, whom createClub refuses too, and creates nothing', async () => {
    const result = await agentService.chat({ message: 'Make a chess club' }, { id: ASKER, roles: ['ZONAL_ADMIN'] });
    expect(clubs).not.toHaveBeenCalled();
    expect(result).toMatchObject({ answer: REFUSAL, action: 'CREATE_CLUBS', created: 0, items: [] });
  });

  it('reads the club roles from the one list the club resolvers use', () => {
    expect(CLUB_WRITE_ROLES).toEqual(['SUPER_ADMIN', 'CITY_ADMIN']);
  });
});

describe('agentService.chat — pod drafts', () => {
  beforeEach(() => plan.mockResolvedValue({ action: 'CREATE_PODS', count: 2, topic: 'Sunday run', reply: 'On it.' }));

  it('saves every draft in the asker’s own account', async () => {
    const result = await agentService.chat({ message: 'Two Sunday runs' }, { id: ASKER, roles: ['ZONAL_ADMIN'] });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft.mock.calls.map((call) => call[0])).toEqual([ASKER, ASKER]);
    expect(saveDraft.mock.calls[1][2]).toMatchObject({ pod_title: 'Sunday run #2', pod_mode: 'PHYSICAL', step: 0 });
    expect(result).toMatchObject({ requested: 2, created: 2, failed: 0 });
    expect(result.answer).toBe('On it.\n\nCreated 2 of 2 pods.');
  });

  it('refuses someone with no admin role, and saves nothing', async () => {
    const result = await agentService.chat({ message: 'Two Sunday runs' }, { id: ASKER, roles: ['USER'] });
    expect(saveDraft).not.toHaveBeenCalled();
    expect(result.answer).toBe(REFUSAL);
  });

  it('refuses an action it has no roles for, even if the planner ever returned one', async () => {
    plan.mockResolvedValue({ action: 'DELETE_EVERYTHING', count: 1, topic: 'x', reply: '' });
    const result = await agentService.chat({ message: 'Delete it all' }, { id: ASKER, roles: ['SUPER_ADMIN'] });
    expect(result.answer).toBe(REFUSAL);
    expect(saveDraft).not.toHaveBeenCalled();
    expect(clubs).not.toHaveBeenCalled();
  });

  it('treats a caller with no roles as having none', async () => {
    const result = await agentService.chat({ message: 'Two Sunday runs' }, { id: ASKER });
    expect(result.answer).toBe(REFUSAL);
  });
});
