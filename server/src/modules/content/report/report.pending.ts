import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { duplicateKeyOn } from '@utils/mongo-error';
import {
  ContentReportModel,
  OPEN_REPORT_STATUSES,
  type ReportTargetType,
} from './contentReport.model';

/**
 * "You already reported this and Legal has not answered yet."
 *
 * A typed code rather than a sentence the apps have to match on: mWeb and the
 * native app map it to `contentReport.alreadyPending` through
 * `reportErrorKey` in @duncit/utils, so the refusal reads in the viewer's
 * language. The English message is only what a client without that mapping
 * shows.
 */
export const REPORT_ALREADY_PENDING = 'REPORT_ALREADY_PENDING';

export function failAlreadyPending(): never {
  throw new GraphQLError(
    'You already reported this. You can report it again once our team has resolved your earlier report.',
    { extensions: { code: REPORT_ALREADY_PENDING } }
  );
}

/**
 * Did this write collide with the one-open-report-per-reporter index? Only that
 * index carries `is_open`, so a collision on `report_no` is not mistaken for it.
 */
export const isOpenReportCollision = (error: unknown) => duplicateKeyOn(error, 'is_open');

/**
 * The viewer's own report on a thing that Legal has not closed yet, or null.
 *
 * Read by status, not by `is_open`, so a row written before `is_open` existed
 * still counts. `targetType` is optional because the client asking "have I
 * already reported this?" only knows the id — a post's id cannot belong to a
 * profile, so the id alone names the thing.
 */
export async function findOpenReport(
  reporterId: string,
  targetId: Types.ObjectId,
  targetType?: ReportTargetType
) {
  return ContentReportModel.findOne({
    reporter_id: new Types.ObjectId(reporterId),
    target_id: targetId,
    ...(targetType ? { target_type: targetType } : {}),
    status: { $in: OPEN_REPORT_STATUSES },
  })
    .select('_id report_no')
    .lean<{ _id: Types.ObjectId; report_no: string | null }>();
}

/**
 * Bring a deployed database up to the one-open-report rule.
 *
 * 1. Stamps `is_open` on rows written before it existed (idempotent: only rows
 *    without the field are touched, and the value is derived from `status`).
 * 2. `syncIndexes` builds the partial unique index and drops the old unique
 *    index over (reporter, type, target) for EVERY status — without the drop a
 *    second report after Legal closed the first would still collide.
 *
 * Legacy data cannot conflict with the new index: the old one already allowed
 * at most one row per reporter and target.
 */
export async function syncReportIndexes(): Promise<number> {
  const backfill = await ContentReportModel.updateMany({ is_open: { $exists: false } }, [
    { $set: { is_open: { $in: ['$status', [...OPEN_REPORT_STATUSES]] } } },
  ]);
  await ContentReportModel.syncIndexes();
  return backfill.modifiedCount;
}
