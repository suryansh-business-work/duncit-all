import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  HealthAdjustmentModel,
  type HealthSubjectType,
  type IHealthAdjustment,
} from './accountHealth.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';

const BASE_SCORE = 100;

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function bandFor(total: number): 'RED' | 'YELLOW' | 'GREEN' {
  if (total < 40) return 'RED';
  if (total < 70) return 'YELLOW';
  return 'GREEN';
}

async function loadAdjustments(subjectType: HealthSubjectType, subjectId: string) {
  const docs = await HealthAdjustmentModel.find({
    subject_type: subjectType,
    subject_id: new Types.ObjectId(subjectId),
  })
    .sort({ created_at: -1 })
    .limit(100);
  return docs;
}

async function adjustmentsToPub(adjustments: IHealthAdjustment[]) {
  const adminIds = Array.from(
    new Set(adjustments.map((a) => a.created_by).filter(Boolean).map(String))
  );
  const admins = adminIds.length
    ? await UserModel.find({ _id: { $in: adminIds } }).select(
        'profile.first_name profile.last_name auth.email'
      )
    : [];
  const adminMap = new Map(
    admins.map((a: any) => [
      String(a._id),
      a.full_name || `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.email || 'Admin',
    ])
  );
  return adjustments.map((a) => ({
    id: String(a._id),
    delta: a.delta,
    remark: a.remark,
    created_by_id: a.created_by ? String(a.created_by) : null,
    created_by_name: a.created_by ? adminMap.get(String(a.created_by)) ?? 'Admin' : 'System',
    created_at: a.created_at.toISOString(),
  }));
}

async function buildScore(
  subjectType: HealthSubjectType,
  subjectId: string,
  subjectLabel: string
) {
  const adjustments = await loadAdjustments(subjectType, subjectId);
  const delta_sum = adjustments.reduce((sum, a) => sum + a.delta, 0);
  const total_score = clamp(BASE_SCORE + delta_sum, 0, 100);
  return {
    subject_type: subjectType,
    subject_id: subjectId,
    subject_label: subjectLabel,
    base_score: BASE_SCORE,
    delta_sum,
    total_score,
    band: bandFor(total_score),
    adjustments: await adjustmentsToPub(adjustments),
  };
}

function userLabel(user: any): string {
  return (
    user?.full_name ||
    `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() ||
    user?.email ||
    'User'
  );
}

// Validates a delta is a non-zero integer within [-100, 100] and returns the
// truncated value. Shared by adjust + editAdjustment.
function validateDelta(input: number): number {
  const delta = Math.trunc(input);
  if (!Number.isFinite(delta) || delta === 0 || delta < -100 || delta > 100) {
    fail('BAD_USER_INPUT', 'Delta must be a non-zero integer between -100 and 100');
  }
  return delta;
}

// Resolves the user this adjustment impacts + a human-readable label for the
// subject. Shared by adjust + editAdjustment + deleteAdjustment.
async function resolveSubject(
  subjectType: HealthSubjectType,
  subjectId: string
): Promise<{ subjectUserId: Types.ObjectId; subjectLabel: string }> {
  if (subjectType === 'USER') {
    const user = await UserModel.findById(subjectId).select(
      'profile.first_name profile.last_name auth.email'
    );
    if (!user) fail('NOT_FOUND', 'User not found');
    return { subjectUserId: (user as any)._id, subjectLabel: userLabel(user) };
  }
  const venue = await VenueModel.findById(subjectId).select('owner_user_id venue_name');
  if (!venue) fail('NOT_FOUND', 'Venue not found');
  return { subjectUserId: venue!.owner_user_id, subjectLabel: venue!.venue_name || 'Venue' };
}

export const accountHealthService = {
  async getMyAccountHealth(userId: string) {
    const user = await UserModel.findById(userId).select(
      'profile.first_name profile.last_name auth.email'
    );
    if (!user) fail('UNAUTHENTICATED', 'User not found');
    return buildScore('USER', String((user as any)._id), userLabel(user));
  },

  async getUserAccountHealth(userId: string) {
    if (!Types.ObjectId.isValid(userId)) fail('BAD_USER_INPUT', 'Invalid user_id');
    const user = await UserModel.findById(userId).select(
      'profile.first_name profile.last_name auth.email'
    );
    if (!user) fail('NOT_FOUND', 'User not found');
    return buildScore('USER', String((user as any)._id), userLabel(user));
  },

  async getMyVenueHealth(userId: string, venueId: string) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findOne({
      _id: venueId,
      owner_user_id: new Types.ObjectId(userId),
    }).select('venue_name');
    if (!venue) fail('NOT_FOUND', 'Venue not found or not yours');
    return buildScore('VENUE', String(venue!._id), venue!.venue_name || 'Venue');
  },

  async getVenueHealth(venueId: string) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findById(venueId).select('venue_name');
    if (!venue) fail('NOT_FOUND', 'Venue not found');
    return buildScore('VENUE', String(venue!._id), venue!.venue_name || 'Venue');
  },

  async adjust(adminId: string, input: {
    subject_type: HealthSubjectType;
    subject_id: string;
    delta: number;
    remark?: string;
  }) {
    if (!Types.ObjectId.isValid(input.subject_id)) fail('BAD_USER_INPUT', 'Invalid subject_id');
    const delta = validateDelta(input.delta);
    const remark = String(input.remark ?? '').trim().slice(0, 500);

    const { subjectUserId, subjectLabel } = await resolveSubject(
      input.subject_type,
      input.subject_id
    );

    await HealthAdjustmentModel.create({
      subject_type: input.subject_type,
      subject_id: new Types.ObjectId(input.subject_id),
      subject_user_id: subjectUserId,
      delta,
      remark,
      created_by: new Types.ObjectId(adminId),
    });

    return buildScore(input.subject_type, input.subject_id, subjectLabel);
  },

  async editAdjustment(_adminId: string, input: { id: string; delta: number; remark?: string }) {
    if (!Types.ObjectId.isValid(input.id)) fail('BAD_USER_INPUT', 'Invalid id');
    const doc = await HealthAdjustmentModel.findById(input.id);
    if (!doc) fail('NOT_FOUND', 'Adjustment not found');
    const delta = validateDelta(input.delta);
    const remark = String(input.remark ?? '').trim().slice(0, 500);

    doc!.delta = delta;
    doc!.remark = remark;
    await doc!.save();

    const { subjectLabel } = await resolveSubject(doc!.subject_type, String(doc!.subject_id));
    return buildScore(doc!.subject_type, String(doc!.subject_id), subjectLabel);
  },

  async deleteAdjustment(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid id');
    const doc = await HealthAdjustmentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Adjustment not found');
    const subjectType = doc!.subject_type;
    const subjectId = String(doc!.subject_id);

    await HealthAdjustmentModel.deleteOne({ _id: doc!._id });

    const { subjectLabel } = await resolveSubject(subjectType, subjectId);
    return buildScore(subjectType, subjectId, subjectLabel);
  },
};
