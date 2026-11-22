import { Types } from 'mongoose';
import { podDraftService } from '../../pod-draft.service';
import { PodDraftModel } from '../../pod-draft.model';

const hostId = () => new Types.ObjectId().toString();
const input = (title: string, step = 0) => ({
  payload: JSON.stringify({ pod_title: title }),
  pod_title: title,
  pod_mode: 'PHYSICAL',
  step,
});

describe('podDraftService.save under a device-minted id', () => {
  it('creates the draft under that id on its first save', async () => {
    const userId = hostId();
    const draftId = new Types.ObjectId().toString();

    const saved = await podDraftService.save(userId, draftId, input('Board games', 1));

    expect(saved).toMatchObject({ id: draftId, pod_title: 'Board games', pod_mode: 'PHYSICAL', step: 1 });
    expect(saved.created_at).not.toBe('');
    const stored = await PodDraftModel.findById(draftId).lean();
    expect(String(stored?.user_id)).toBe(userId);
    await expect(podDraftService.getMine(userId, draftId)).resolves.toMatchObject({ id: draftId });
  });

  it('updates the same draft on every later save, keeping its creation date', async () => {
    const userId = hostId();
    const draftId = new Types.ObjectId().toString();
    const first = await podDraftService.save(userId, draftId, input('Draft', 0));

    const second = await podDraftService.save(userId, draftId, input('Draft, retitled', 2));

    expect(second).toMatchObject({ id: draftId, pod_title: 'Draft, retitled', step: 2 });
    expect(second.created_at).toBe(first.created_at);
    expect(await PodDraftModel.countDocuments({ user_id: new Types.ObjectId(userId) })).toBe(1);
  });

  it('makes one draft when two first saves race', async () => {
    const userId = hostId();
    const draftId = new Types.ObjectId().toString();

    const results = await Promise.allSettled([
      podDraftService.save(userId, draftId, input('Tab A')),
      podDraftService.save(userId, draftId, input('Tab B')),
    ]);

    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    expect(await PodDraftModel.countDocuments({ _id: draftId })).toBe(1);
  });

  it('refuses another member’s draft id as NOT_FOUND and leaves that draft untouched', async () => {
    const owner = hostId();
    const draftId = new Types.ObjectId().toString();
    await podDraftService.save(owner, draftId, input('Owner’s pod', 2));

    await expect(podDraftService.save(hostId(), draftId, input('Hijacked'))).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(podDraftService.getMine(owner, draftId)).resolves.toMatchObject({
      pod_title: 'Owner’s pod',
      step: 2,
    });
  });

  it('refuses an id that is not an ObjectId as BAD_USER_INPUT and stores nothing', async () => {
    const userId = hostId();
    await expect(podDraftService.save(userId, 'not-a-draft-id', input('Nope'))).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await PodDraftModel.countDocuments({ user_id: new Types.ObjectId(userId) })).toBe(0);
  });

  it('still creates a fresh draft with a server id when no id is sent', async () => {
    const userId = hostId();
    const saved = await podDraftService.save(userId, null, input('Server id'));
    expect(Types.ObjectId.isValid(saved.id)).toBe(true);
    expect((await podDraftService.listMine(userId)).map((draft) => draft.id)).toEqual([saved.id]);
  });
});
