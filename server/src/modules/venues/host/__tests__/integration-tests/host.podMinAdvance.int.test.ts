/**
 * A host's own Minimum Advance Days for Pod Creation — set in the Hosts console,
 * winning over Pod Settings. null clears it back to the platform value.
 */
import { Types } from 'mongoose';
import { hostService } from '../../host.service';
import { HostModel } from '../../host.model';

const badInput = expect.objectContaining({ extensions: expect.objectContaining({ code: 'BAD_USER_INPUT' }) });
const notFound = expect.objectContaining({ extensions: expect.objectContaining({ code: 'NOT_FOUND' }) });

describe('Minimum Advance Days override', () => {
  it('is unset on a new host, so the platform value applies', async () => {
    const h = await HostModel.create({ user_id: new Types.ObjectId() });
    expect(await hostService.getById(String(h._id))).toMatchObject({ pod_min_advance_days_override: null });
  });

  it('saves 1 and 30 (the ends of the range) and clears with null', async () => {
    const h = await HostModel.create({ user_id: new Types.ObjectId() });
    const id = String(h._id);
    expect(await hostService.setPodMinAdvanceDaysOverride(id, 1)).toMatchObject({ pod_min_advance_days_override: 1 });
    expect(await hostService.setPodMinAdvanceDaysOverride(id, 30)).toMatchObject({ pod_min_advance_days_override: 30 });
    expect(await hostService.setPodMinAdvanceDaysOverride(id, null)).toMatchObject({ pod_min_advance_days_override: null });
    expect((await HostModel.findById(id).lean())?.pod_min_advance_days_override).toBeNull();
  });

  it.each([[0], [31], [-2], [2.5]])('refuses %p and leaves the saved value alone', async (days) => {
    const h = await HostModel.create({ user_id: new Types.ObjectId(), pod_min_advance_days_override: 4 });
    await expect(hostService.setPodMinAdvanceDaysOverride(String(h._id), days)).rejects.toEqual(badInput);
    expect((await HostModel.findById(h._id).lean())?.pod_min_advance_days_override).toBe(4);
  });

  it('refuses an override for a host that does not exist', async () => {
    await expect(hostService.setPodMinAdvanceDaysOverride(new Types.ObjectId().toString(), 5)).rejects.toEqual(notFound);
  });
});
