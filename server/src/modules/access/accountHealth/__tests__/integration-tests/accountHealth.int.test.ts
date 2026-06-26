import { Types } from 'mongoose';
import { accountHealthService } from '../../accountHealth.service';
import { UserModel } from '../../../user/user.model';

async function makeUser() {
  const u = await UserModel.create({
    auth: { email: `health-${Date.now()}-${Math.random()}@duncit.com` },
    profile: { first_name: 'Health', last_name: 'User' },
  });
  return String(u._id);
}

describe('accountHealthService integration', () => {
  const adminId = new Types.ObjectId().toString();

  it('throws NOT_FOUND for a missing user', async () => {
    await expect(
      accountHealthService.getUserAccountHealth(new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });

  it('throws when the current user no longer exists', async () => {
    await expect(
      accountHealthService.getMyAccountHealth(new Types.ObjectId().toString())
    ).rejects.toThrow(/user not found/i);
  });

  it('throws NOT_FOUND for a missing venue', async () => {
    await expect(
      accountHealthService.getVenueHealth(new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });

  it('adjust saves with NO remark and stores an empty string', async () => {
    const userId = await makeUser();
    const score = await accountHealthService.adjust(adminId, {
      subject_type: 'USER',
      subject_id: userId,
      delta: -10,
    });
    expect(score.delta_sum).toBe(-10);
    expect(score.total_score).toBe(90);
    expect(score.band).toBe('GREEN');
    expect(score.adjustments).toHaveLength(1);
    expect(score.adjustments[0].remark).toBe('');
  });

  it('editAdjustment changes delta_sum and band in place', async () => {
    const userId = await makeUser();
    const created = await accountHealthService.adjust(adminId, {
      subject_type: 'USER',
      subject_id: userId,
      delta: -10,
      remark: 'first',
    });
    expect(created.band).toBe('GREEN');
    const adjustmentId = created.adjustments[0].id;

    const edited = await accountHealthService.editAdjustment(adminId, {
      id: adjustmentId,
      delta: -65,
      remark: 'escalated',
    });
    expect(edited.delta_sum).toBe(-65);
    expect(edited.total_score).toBe(35);
    expect(edited.band).toBe('RED');
    expect(edited.adjustments).toHaveLength(1);
    expect(edited.adjustments[0].id).toBe(adjustmentId);
    expect(edited.adjustments[0].delta).toBe(-65);
    expect(edited.adjustments[0].remark).toBe('escalated');
  });

  it('deleteAdjustment removes a row and recomputes the score', async () => {
    const userId = await makeUser();
    const a1 = await accountHealthService.adjust(adminId, {
      subject_type: 'USER',
      subject_id: userId,
      delta: -20,
      remark: 'one',
    });
    await accountHealthService.adjust(adminId, {
      subject_type: 'USER',
      subject_id: userId,
      delta: -15,
      remark: 'two',
    });
    const idToDelete = a1.adjustments[0].id;

    const afterDelete = await accountHealthService.deleteAdjustment(idToDelete);
    expect(afterDelete.adjustments).toHaveLength(1);
    expect(afterDelete.delta_sum).toBe(-15);
    expect(afterDelete.total_score).toBe(85);
    expect(afterDelete.adjustments.some((a) => a.id === idToDelete)).toBe(false);
  });

  it('editAdjustment rejects an unknown id', async () => {
    await expect(
      accountHealthService.editAdjustment(adminId, {
        id: new Types.ObjectId().toString(),
        delta: -5,
      })
    ).rejects.toThrow(/not found/i);
  });

  it('deleteAdjustment rejects an invalid id', async () => {
    await expect(accountHealthService.deleteAdjustment('bad')).rejects.toThrow(/invalid id/i);
  });
});
