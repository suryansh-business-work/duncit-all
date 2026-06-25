import { Types } from 'mongoose';
import { approvalService } from '../../approval.service';
import { ApprovalRequestModel } from '../../approval.model';
import { meetingService } from '@modules/survey/meeting.service';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { UserModel } from '@modules/access/user/user.model';
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

  it('lists requests filtered by status and type, and 404s an unknown id', async () => {
    const pending = await approvalService.list({ status: 'PENDING' });
    expect(pending.every((r: any) => r.status === 'PENDING')).toBe(true);
    const byType = await approvalService.list({ type: 'ONBOARDING_MEETING_FEEDBACK' });
    expect(byType.every((r: any) => r.type === 'ONBOARDING_MEETING_FEEDBACK')).toBe(true);

    await expect(approvalService.approve(new Types.ObjectId().toString(), ADMIN)).rejects.toThrow(/not found/i);
    await expect(approvalService.deny(new Types.ObjectId().toString(), ADMIN)).rejects.toThrow(/not found/i);
  });
});
