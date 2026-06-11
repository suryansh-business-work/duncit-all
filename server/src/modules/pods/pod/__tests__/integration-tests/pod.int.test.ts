import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';

const makePod = (over: Record<string, unknown> = {}) => ({
  pod_id: `p-${Math.random().toString(36).slice(2)}`,
  pod_title: 'Test pod',
  club_id: new Types.ObjectId(),
  pod_description: 'desc',
  pod_type: 'NATIVE_FREE',
  pod_date_time: new Date(Date.now() + 86_400_000),
  is_active: true,
  ...over,
});

describe('podService integration', () => {
  it('lists no pods on an empty dataset', async () => {
    expect(await podService.list()).toEqual([]);
  });

  it('returns null for a missing pod id', async () => {
    expect(await podService.getById(new Types.ObjectId().toString())).toBeNull();
  });

  it('reports only locations with a live (active, upcoming) pod', async () => {
    const live = new Types.ObjectId();
    const inactive = new Types.ObjectId();
    const past = new Types.ObjectId();
    await PodModel.create(makePod({ location_id: live }));
    await PodModel.create(makePod({ location_id: inactive, is_active: false }));
    await PodModel.create(makePod({ location_id: past, pod_date_time: new Date(Date.now() - 86_400_000) }));
    await PodModel.create(makePod({ location_id: null }));

    const ids = await podService.activeLocationIds();
    expect(ids).toContain(String(live));
    expect(ids).not.toContain(String(inactive));
    expect(ids).not.toContain(String(past));
  });
});
