import { Types } from 'mongoose';
import { accountHealthService } from '../../accountHealth.service';
import { HealthAdjustmentModel } from '../../accountHealth.model';
import { UserModel } from '../../../user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';

async function makeUser() {
  const u = await UserModel.create({
    auth: { email: `health-${Date.now()}-${Math.random()}@duncit.com` },
    profile: { first_name: 'Health', last_name: 'User' },
  });
  return String(u._id);
}

async function makeVenue() {
  const owner = await UserModel.create({
    auth: { email: `venue-${Date.now()}-${Math.random()}@duncit.com` },
    profile: { first_name: 'Venue', last_name: 'Owner' },
  });
  const v = await VenueModel.create({
    owner_user_id: owner._id,
    venue_name: 'Rooftop Hall',
  } as never);
  return String(v._id);
}

const countAdjustments = (venueId: string) =>
  HealthAdjustmentModel.countDocuments({ subject_id: new Types.ObjectId(venueId) });

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

  describe('applySystemPenalty', () => {
    it('rejects an invalid subject id', async () => {
      await expect(
        accountHealthService.applySystemPenalty({
          subject_type: 'VENUE',
          subject_id: 'bad',
          points: 5,
          remark: 'cancelled a pod',
        })
      ).rejects.toThrow(/invalid subject_id/i);
    });

    it('throws NOT_FOUND when the subject venue no longer exists', async () => {
      await expect(
        accountHealthService.applySystemPenalty({
          subject_type: 'VENUE',
          subject_id: new Types.ObjectId().toString(),
          points: 5,
          remark: 'cancelled a pod',
        })
      ).rejects.toThrow(/venue not found/i);
    });

    it('deducts the points from a venue and credits System as the actor', async () => {
      const venueId = await makeVenue();
      const score = await accountHealthService.applySystemPenalty({
        subject_type: 'VENUE',
        subject_id: venueId,
        points: 5,
        remark: '  Venue owner cancelled the pod "Sunset Jam".  ',
      });
      expect(score).toBe(95);

      const health = await accountHealthService.getVenueHealth(venueId);
      expect(health.total_score).toBe(95);
      expect(health.adjustments).toHaveLength(1);
      expect(health.adjustments[0].delta).toBe(-5);
      // No admin behind a system penalty — the pub mapper renders it as System.
      expect(health.adjustments[0].created_by_id).toBeNull();
      expect(health.adjustments[0].created_by_name).toBe('System');
      expect(health.adjustments[0].remark).toBe('Venue owner cancelled the pod "Sunset Jam".');
    });

    it('records nothing for a zero penalty and still reports the current score', async () => {
      const venueId = await makeVenue();
      await accountHealthService.applySystemPenalty({
        subject_type: 'VENUE',
        subject_id: venueId,
        points: 10,
        remark: 'earlier cancellation',
      });

      const score = await accountHealthService.applySystemPenalty({
        subject_type: 'VENUE',
        subject_id: venueId,
        points: 0,
        remark: 'penalty disabled by the admin',
      });
      expect(score).toBe(90);
      expect(await countAdjustments(venueId)).toBe(1);
    });

    it('treats a negative or unusable magnitude as no penalty at all', async () => {
      const venueId = await makeVenue();
      expect(
        await accountHealthService.applySystemPenalty({
          subject_type: 'VENUE',
          subject_id: venueId,
          points: -20,
          remark: 'negative',
        })
      ).toBe(100);
      expect(
        await accountHealthService.applySystemPenalty({
          subject_type: 'VENUE',
          subject_id: venueId,
          points: Number.NaN,
          remark: 'junk',
        })
      ).toBe(100);
      expect(await countAdjustments(venueId)).toBe(0);
    });

    it('clamps an oversized penalty to the -100 the adjustment schema allows', async () => {
      const venueId = await makeVenue();
      const score = await accountHealthService.applySystemPenalty({
        subject_type: 'VENUE',
        subject_id: venueId,
        points: 250,
        remark: 'oversized',
      });
      expect(score).toBe(0);

      const health = await accountHealthService.getVenueHealth(venueId);
      expect(health.adjustments[0].delta).toBe(-100);
      expect(health.band).toBe('RED');
    });

    it('floors a fractional magnitude and truncates the remark at 500 characters', async () => {
      const venueId = await makeVenue();
      const score = await accountHealthService.applySystemPenalty({
        subject_type: 'VENUE',
        subject_id: venueId,
        points: 7.9,
        remark: 'x'.repeat(600),
      });
      expect(score).toBe(93);

      const health = await accountHealthService.getVenueHealth(venueId);
      expect(health.adjustments[0].remark).toHaveLength(500);
    });

    it('penalises a USER subject through the same shared resolver', async () => {
      const userId = await makeUser();
      const score = await accountHealthService.applySystemPenalty({
        subject_type: 'USER',
        subject_id: userId,
        points: 3,
        remark: 'system penalty',
      });
      expect(score).toBe(97);

      const health = await accountHealthService.getUserAccountHealth(userId);
      expect(health.adjustments[0].created_by_name).toBe('System');
    });
  });
});
