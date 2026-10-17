import { Types } from 'mongoose';
import { podDraftService } from '../../pod-draft.service';
import { PodDraftModel } from '../../pod-draft.model';

const hostId = () => new Types.ObjectId().toString();

async function draftAt(userId: string, step: number) {
  return podDraftService.save(userId, null, {
    payload: JSON.stringify({ pod_title: `Step ${step + 1} pod` }),
    pod_title: `Step ${step + 1} pod`,
    pod_mode: 'PHYSICAL',
    step,
  });
}

describe('podDraftService.remove', () => {
  // The stepper has four steps (0-3); a host must be able to drop a draft from any of them.
  it.each([0, 1, 2, 3])('deletes a draft saved at step %i and it stays gone', async (step) => {
    const userId = hostId();
    const draft = await draftAt(userId, step);
    const other = await draftAt(userId, step === 0 ? 1 : 0);

    await expect(podDraftService.remove(userId, draft.id)).resolves.toBe(true);

    const listed = await podDraftService.listMine(userId);
    expect(listed.map((d) => d.id)).toEqual([other.id]);
    expect(await PodDraftModel.exists({ _id: draft.id })).toBeNull();
    await expect(podDraftService.getMine(userId, draft.id)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('answers NOT_FOUND, not false, when the draft was already deleted', async () => {
    const userId = hostId();
    const draft = await draftAt(userId, 1);
    await podDraftService.remove(userId, draft.id);

    await expect(podDraftService.remove(userId, draft.id)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('answers FORBIDDEN for another host’s draft and leaves it in place', async () => {
    const owner = hostId();
    const draft = await draftAt(owner, 2);

    await expect(podDraftService.remove(hostId(), draft.id)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    expect((await podDraftService.listMine(owner)).map((d) => d.id)).toEqual([draft.id]);
  });

  it('answers NOT_FOUND for an id that is not a draft id at all', async () => {
    await expect(podDraftService.remove(hostId(), 'not-an-object-id')).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });
});
