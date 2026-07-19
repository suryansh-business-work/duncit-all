import { Types } from 'mongoose';
import { startTestServer, type TestServer } from '@test/harness';
import { PodDraftModel } from '../../pod-draft.model';
import { AppSettingsModel } from '@modules/platform/settings/settings.model';
import { runPodDraftCleanup } from '../../pod-draft.cleanup';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** Force a draft's last-save timestamp without tripping mongoose auto-timestamps. */
async function ageDraft(id: Types.ObjectId, daysAgo: number) {
  await PodDraftModel.updateOne(
    { _id: id },
    { $set: { updated_at: new Date(Date.now() - daysAgo * DAY_MS) } },
    { timestamps: false },
  );
}

describe('runPodDraftCleanup', () => {
  it('deletes drafts past the configured window and keeps fresh ones', async () => {
    await AppSettingsModel.updateOne(
      { singleton_key: 'app' },
      { $set: { draft_retention_days: 3 } },
      { upsert: true },
    );
    const uid = new Types.ObjectId();
    const stale = await PodDraftModel.create({ user_id: uid, pod_title: 'Stale', payload: '{}' });
    const fresh = await PodDraftModel.create({ user_id: uid, pod_title: 'Fresh', payload: '{}' });
    await ageDraft(stale._id as Types.ObjectId, 5); // older than the 3-day window
    await ageDraft(fresh._id as Types.ObjectId, 1); // still within the window

    const removed = await runPodDraftCleanup();

    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await PodDraftModel.findById(stale._id)).toBeNull();
    expect(await PodDraftModel.findById(fresh._id)).not.toBeNull();
  });

  it('clamps a missing retention setting to the safe default and never throws', async () => {
    await AppSettingsModel.updateOne({ singleton_key: 'app' }, { $unset: { draft_retention_days: '' } });
    const uid = new Types.ObjectId();
    const old = await PodDraftModel.create({ user_id: uid, pod_title: 'Old', payload: '{}' });
    await ageDraft(old._id as Types.ObjectId, 10);

    const removed = await runPodDraftCleanup();

    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await PodDraftModel.findById(old._id)).toBeNull();
  });
});
