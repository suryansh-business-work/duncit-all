import { Types } from 'mongoose';
import { ClubSlotRequestModel } from '../../clubSlotRequest.model';
import { clubSlotRequestService } from '../../clubSlotRequest.service';

/**
 * Staff closing a "no open venue slots" request: the first resolution is the
 * one on record — a second press, or a second staff member, never rewrites
 * who resolved it or when.
 */

const seedRequest = () =>
  ClubSlotRequestModel.create({
    club_id: new Types.ObjectId(),
    club_name: 'Padel Club',
    host_user_id: new Types.ObjectId(),
    host_name: 'Asha',
    host_contact: '+919876543210',
    notified: 2,
  });

describe('clubSlotRequestService.resolve', () => {
  it('resolves an open request and records who resolved it', async () => {
    const req = await seedRequest();
    const staff = new Types.ObjectId().toHexString();

    const out = await clubSlotRequestService.resolve(String(req._id), staff);

    expect(out.status).toBe('RESOLVED');
    expect(out.resolved_at).not.toBeNull();
    const saved = await ClubSlotRequestModel.findById(req._id).lean();
    expect(String(saved?.resolved_by_id)).toBe(staff);
  });

  it('keeps the first resolver and time when it is resolved again', async () => {
    const req = await seedRequest();
    const first = new Types.ObjectId().toHexString();
    const second = new Types.ObjectId().toHexString();

    const resolved = await clubSlotRequestService.resolve(String(req._id), first);
    const again = await clubSlotRequestService.resolve(String(req._id), second);

    expect(again).toMatchObject({ status: 'RESOLVED', resolved_at: resolved.resolved_at });
    const saved = await ClubSlotRequestModel.findById(req._id).lean();
    expect(String(saved?.resolved_by_id)).toBe(first);
    expect(saved?.resolved_at?.toISOString()).toBe(resolved.resolved_at);
  });

  it('records exactly one resolver when two staff resolve at the same moment', async () => {
    const req = await seedRequest();
    const staff = [new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()];

    const [a, b] = await Promise.all(staff.map((id) => clubSlotRequestService.resolve(String(req._id), id)));

    expect(a.resolved_at).toBe(b.resolved_at);
    const saved = await ClubSlotRequestModel.findById(req._id).lean();
    expect(staff).toContain(String(saved?.resolved_by_id));
    expect(saved?.resolved_at?.toISOString()).toBe(a.resolved_at);
  });

  it('refuses a malformed id and answers NOT_FOUND for a missing request', async () => {
    await expect(clubSlotRequestService.resolve('nope', new Types.ObjectId().toHexString())).rejects.toMatchObject({
      message: 'Invalid request id',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(
      clubSlotRequestService.resolve(new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString())
    ).rejects.toMatchObject({ message: 'Request not found', extensions: { code: 'NOT_FOUND' } });
  });
});
