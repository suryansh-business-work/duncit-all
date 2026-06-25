import { Types } from 'mongoose';
import { hostService } from '@modules/venues/host/host.service';
import { venueService } from '@modules/venues/venue/venue.service';
import { ecommBrandService } from '@modules/venues/ecommBrand/ecommBrand.service';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';

// Mirrors what user.service.replaceUserRoles triggers when an onboarding role is
// revoked from Access — the approved entity must drop out of APPROVED.
describe('revokeApprovalForUser (role revoke → un-approve onboarding entity)', () => {
  it('downgrades an APPROVED host to REJECTED', async () => {
    const userId = new Types.ObjectId();
    await HostModel.create({ user_id: userId, status: 'APPROVED' });
    await hostService.revokeApprovalForUser(userId.toString());
    const h: any = await HostModel.findOne({ user_id: userId });
    expect(h.status).toBe('REJECTED');
    expect(h.rejected_at).toBeTruthy();
  });

  it('downgrades all of a user’s APPROVED venues, leaving non-approved untouched', async () => {
    const userId = new Types.ObjectId();
    await VenueModel.create({ owner_user_id: userId, status: 'APPROVED' });
    await VenueModel.create({ owner_user_id: userId, status: 'APPROVED' });
    const draft = await VenueModel.create({ owner_user_id: userId, status: 'DRAFT' });
    await venueService.revokeApprovalForUser(userId.toString());
    expect(await VenueModel.countDocuments({ owner_user_id: userId, status: 'APPROVED' })).toBe(0);
    expect((await VenueModel.findById(draft._id))!.status).toBe('DRAFT');
  });

  it('downgrades an APPROVED brand to REJECTED', async () => {
    const userId = new Types.ObjectId();
    await EcommBrandModel.create({ owner_user_id: userId, status: 'APPROVED' });
    await ecommBrandService.revokeApprovalForUser(userId.toString());
    const b: any = await EcommBrandModel.findOne({ owner_user_id: userId });
    expect(b.status).toBe('REJECTED');
  });

  it('no-ops when the user has no approved entity', async () => {
    const userId = new Types.ObjectId();
    await expect(hostService.revokeApprovalForUser(userId.toString())).resolves.toBe(true);
  });
});
