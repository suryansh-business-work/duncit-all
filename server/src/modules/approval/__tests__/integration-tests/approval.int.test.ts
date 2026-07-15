import { Types } from 'mongoose';
import { approvalService } from '../../approval.service';
import { ApprovalRequestModel } from '../../approval.model';
import { meetingService } from '@modules/survey/meeting.service';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { UserModel } from '@modules/access/user/user.model';
import { userService } from '@modules/access/user/user.service';
import type { SurveyKind } from '@modules/survey/survey.model';

jest.mock('@services/email/email.service', () => ({
  sendMeetingBookedEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingScheduledEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingScheduledAdminEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingCancelledEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

const ADMIN = { id: 'admin-1', name: 'admin@example.com' };

let phoneSeq = 9200000000;
const nextPhone = () => String(++phoneSeq);

/** Create a user, raise a meeting, and mark it DONE — the state needed before
 * feedback can be sent. Each call uses a distinct slot to avoid collisions. */
async function doneMeeting(kind: SurveyKind, requestedAt: string, name = 'Appy Test') {
  const user = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id: user,
    auth: { email: `${user.toString()}@example.com` },
    profile: { first_name: name },
  } as never);
  await meetingService.request(user.toString(), kind, { requested_at: requestedAt, contact_phone: nextPhone() });
  const m = await meetingService.myMeeting(user.toString(), kind);
  await meetingService.update(m!.id, { status: 'DONE' });
  return { userId: user.toString(), meetingId: m!.id };
}

const pendingFor = (userId: string) => ApprovalRequestModel.findOne({ subject_user_id: new Types.ObjectId(userId) });

describe('approval — meeting feedback flow', () => {
  it('only lets staff send feedback once the meeting is DONE, and raises a pending request', async () => {
    const user = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: user,
      auth: { email: 'host@example.com' },
      profile: { first_name: 'Hosty' },
    } as never);
    await meetingService.request(user.toString(), 'HOST', { requested_at: '2027-08-01T05:00:00.000Z', contact_phone: nextPhone() });
    const m = await meetingService.myMeeting(user.toString(), 'HOST');

    // Cannot send feedback before the meeting is done.
    await expect(meetingService.sendFeedback(m!.id, 'Great', ADMIN)).rejects.toThrow(/done/i);

    await meetingService.update(m!.id, { status: 'DONE' });
    // Feedback text is required.
    await expect(meetingService.sendFeedback(m!.id, '  ', ADMIN)).rejects.toThrow(/feedback/i);

    const sent = await meetingService.sendFeedback(m!.id, 'Strong candidate', { id: 'ops-1', name: 'ops@example.com' });
    expect(sent!.approval_status).toBe('PENDING');
    expect(sent!.feedback).toBe('Strong candidate');

    const req: any = await pendingFor(user.toString());
    expect(req.type).toBe('ONBOARDING_MEETING_FEEDBACK');
    expect(req.status).toBe('PENDING');
    expect(req.kind).toBe('HOST');
    expect(req.subject_name).toBe('Hosty');
    expect(req.details.some((d: any) => d.label === 'Interviewer feedback' && d.value === 'Strong candidate')).toBe(true);

    // Re-sending while it's already with the admin is blocked.
    await expect(meetingService.sendFeedback(m!.id, 'again', ADMIN)).rejects.toThrow(/already/i);
  });

  it('approving drafts the onboarded host and marks the meeting approved', async () => {
    const { userId, meetingId } = await doneMeeting('HOST', '2027-08-02T05:00:00.000Z', 'Drafty');
    await meetingService.sendFeedback(meetingId, 'Approve please', ADMIN);
    const req: any = await pendingFor(userId);

    const approved = await approvalService.approve(String(req._id), ADMIN, 'Looks good');
    expect(approved!.status).toBe('APPROVED');
    expect(approved!.reviewed_by_name).toBe('admin@example.com');

    const host: any = await HostModel.findOne({ user_id: new Types.ObjectId(userId) });
    expect(host).not.toBeNull();
    expect(host.status).toBe('DRAFT');
    expect(host.full_name).toBe('Drafty');

    const meeting = await meetingService.myMeeting(userId, 'HOST');
    expect(meeting!.approval_status).toBe('APPROVED');

    // A reviewed request can't be reviewed again.
    await expect(approvalService.approve(String(req._id), ADMIN)).rejects.toThrow(/already/i);
  });

  it('drafts a venue and a seller brand on approval by kind', async () => {
    const venue = await doneMeeting('VENUE', '2027-08-03T05:00:00.000Z', 'Venue Owner');
    await meetingService.sendFeedback(venue.meetingId, 'ok', ADMIN);
    await approvalService.approve(String((await pendingFor(venue.userId))!._id), ADMIN);
    const v: any = await VenueModel.findOne({ owner_user_id: new Types.ObjectId(venue.userId) });
    expect(v?.status).toBe('DRAFT');
    expect(v?.owner_name).toBe('Venue Owner');

    const seller = await doneMeeting('ECOMM', '2027-08-04T05:00:00.000Z', 'Seller Person');
    await meetingService.sendFeedback(seller.meetingId, 'ok', ADMIN);
    await approvalService.approve(String((await pendingFor(seller.userId))!._id), ADMIN);
    const b: any = await EcommBrandModel.findOne({ owner_user_id: new Types.ObjectId(seller.userId) });
    expect(b?.status).toBe('DRAFT');
    expect(b?.contact_person).toBe('Seller Person');
  });

  it('grants the CLUB_ADMIN role on approval (no drafted entity)', async () => {
    // Role assignment uses a transaction (real replica set in prod); the standalone
    // test mongo can't run it, so spy on addRole to assert the branch wiring.
    const spy = jest.spyOn(userService, 'addRole').mockResolvedValue(undefined as never);
    const club = await doneMeeting('CLUB_ADMIN', '2027-08-05T05:00:00.000Z', 'Club Boss');
    await meetingService.sendFeedback(club.meetingId, 'ok', ADMIN);
    await approvalService.approve(String((await pendingFor(club.userId))!._id), ADMIN);
    expect(spy).toHaveBeenCalledWith(club.userId, 'CLUB_ADMIN');
    const meeting = await meetingService.myMeeting(club.userId, 'CLUB_ADMIN');
    expect(meeting!.approval_status).toBe('APPROVED');
    spy.mockRestore();
  });

  it('denying marks the meeting denied, drafts nothing, and blocks a re-send until re-requested', async () => {
    const { userId, meetingId } = await doneMeeting('HOST', '2027-08-05T05:00:00.000Z', 'Rejy');
    await meetingService.sendFeedback(meetingId, 'unsure', ADMIN);
    const req: any = await pendingFor(userId);

    const denied = await approvalService.deny(String(req._id), ADMIN, 'Not a fit');
    expect(denied!.status).toBe('DENIED');
    const meeting = await meetingService.myMeeting(userId, 'HOST');
    expect(meeting!.approval_status).toBe('DENIED');
    expect(await HostModel.findOne({ user_id: new Types.ObjectId(userId) })).toBeNull();

    // A denied meeting is terminal — feedback can't be re-sent without a re-apply.
    await expect(meetingService.sendFeedback(meetingId, 'reconsider', ADMIN)).rejects.toThrow(/already/i);
    await expect(approvalService.deny(String(req._id), ADMIN, 'x')).rejects.toThrow(/already/i);
  });

  it('submits a product change, lists it by kind, and applies the payload on approval (Task B item 2)', async () => {
    const productId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: productId,
      product_name: 'Old name',
      selling_price: 100,
    } as never);

    const req = await approvalService.submitEcommChange(
      {
        kind: 'PRODUCT',
        target_id: productId.toString(),
        target_name: 'Old name',
        details: [{ label: 'Selling price (₹)', value: '999' }],
        payload: JSON.stringify({ selling_price: 999, product_name: 'New name' }),
      },
      { id: 'pm-1', name: 'pm@example.com' },
    );
    expect(req!.type).toBe('ECOMM_PRODUCT_CHANGE');
    expect(req!.status).toBe('PENDING');
    expect(req!.target_id).toBe(productId.toString());

    // Listing is kind-scoped.
    expect((await approvalService.listEcommChanges('PRODUCT')).some((r: any) => r.id === req!.id)).toBe(true);
    expect((await approvalService.listEcommChanges('BRAND')).some((r: any) => r.id === req!.id)).toBe(false);
    expect((await approvalService.listEcommChanges()).some((r: any) => r.id === req!.id)).toBe(true);

    // Approval applies the payload to the product.
    await approvalService.approve(req!.id, ADMIN);
    const updated: any = await InventoryProductModel.findById(productId);
    expect(updated.selling_price).toBe(999);
    expect(updated.product_name).toBe('New name');
  });

  it('applies a brand change on approval and tolerates a malformed payload (Task B item 2)', async () => {
    const brandId = new Types.ObjectId();
    await EcommBrandModel.collection.insertOne({ _id: brandId, brand_name: 'B', tagline: 'old' } as never);
    const brandReq = await approvalService.submitEcommChange(
      {
        kind: 'BRAND',
        target_id: brandId.toString(),
        target_name: 'B',
        details: [{ label: 'Tagline', value: 'new tag' }],
        payload: JSON.stringify({ tagline: 'new tag' }),
      },
      ADMIN,
    );
    expect(brandReq!.type).toBe('ECOMM_BRAND_CHANGE');
    await approvalService.approve(brandReq!.id, ADMIN);
    const brand: any = await EcommBrandModel.findById(brandId);
    expect(brand.tagline).toBe('new tag');

    // A malformed payload is swallowed — the approval still succeeds.
    const bad = await approvalService.submitEcommChange(
      {
        kind: 'PRODUCT',
        target_id: new Types.ObjectId().toString(),
        target_name: 'X',
        details: [{ label: 'x', value: 'y' }],
        payload: 'not-json',
      },
      ADMIN,
    );
    const approved = await approvalService.approve(bad!.id, ADMIN);
    expect(approved!.status).toBe('APPROVED');
  });

  it('lists requests filtered by status and type, and 404s an unknown id', async () => {
    const pending = await approvalService.list({ status: 'PENDING' });
    expect(pending.every((r: any) => r.status === 'PENDING')).toBe(true);
    const byType = await approvalService.list({ type: 'ONBOARDING_MEETING_FEEDBACK' });
    expect(byType.every((r: any) => r.type === 'ONBOARDING_MEETING_FEEDBACK')).toBe(true);

    await expect(approvalService.approve(new Types.ObjectId().toString(), ADMIN)).rejects.toThrow(/not found/i);
    await expect(approvalService.deny(new Types.ObjectId().toString(), ADMIN)).rejects.toThrow(/not found/i);
  });
});
