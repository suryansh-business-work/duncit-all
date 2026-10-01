import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { postService } from '@modules/engagement/post/post.service';
import {
  ContentReportModel,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type IContentReport,
  type ReportActionType,
  type ReportStatus,
  type ReportTargetType,
} from './contentReport.model';
import { sendContentReportMessage } from './report.email';
import { reportCategoryService } from './reportCategory.service';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const DETAILS_MAX = 2000;
const NOTE_MAX = 5000;
const SUBJECT_MAX = 150;

/** The targets that are `Post` documents — the ones Legal can take down today. */
const POST_TARGETS = new Set<ReportTargetType>(['STORY', 'POST']);
const OPEN_STATUSES = new Set<ReportStatus>(['RECEIVED', 'IN_REVIEW']);
const CLOSED_STATUSES = new Set<ReportStatus>(['ACTIONED', 'DISMISSED']);

export type ReportMailRecipient = 'REPORTER' | 'OWNER';

/** What a page of reports needs that is not on the reports themselves. */
interface ReportContext {
  live: Set<string>;
  counts: Map<string, number>;
  labels: Map<string, string>;
}

const targetKey = (r: Pick<IContentReport, 'target_type' | 'target_id'>) =>
  `${r.target_type}:${r.target_id.toString()}`;

/**
 * Is the reported thing still up?
 *
 * Only posts and stories can be looked up; for the target types nothing files
 * under yet, "not taken down by us" is the only fact there is.
 */
function isLive(r: IContentReport, ctx: ReportContext): boolean {
  if (POST_TARGETS.has(r.target_type)) return ctx.live.has(r.target_id.toString());
  return !r.target_removed_at;
}

const toPub = (r: IContentReport, ctx: ReportContext) => ({
  id: String(r.id),
  report_no: r.report_no ?? '',
  target_type: r.target_type,
  target_id: r.target_id.toString(),
  club_id: r.club_id ? r.club_id.toString() : null,
  target_preview_url: r.target_preview_url ?? '',
  target_caption: r.target_caption ?? '',
  reason: r.reason,
  // A category deleted before any report used it cannot be named here; one in
  // use cannot be deleted, so the key only ever shows for hand-edited data.
  reason_label: ctx.labels.get(r.reason) ?? r.reason,
  details: r.details ?? '',
  status: r.status,
  resolution: r.resolution ?? '',
  resolved_at: r.resolved_at ? r.resolved_at.toISOString() : null,
  target_live: isLive(r, ctx),
  target_removed_at: r.target_removed_at ? r.target_removed_at.toISOString() : null,
  report_count: ctx.counts.get(targetKey(r)) ?? 1,
  history: (r.history ?? []).map((entry) => ({
    id: entry._id.toString(),
    action: entry.action,
    by: entry.by,
    at: entry.at.toISOString(),
    note: entry.note ?? '',
  })),
  // The ids the ContentReport field resolvers turn into names.
  reporter_id: r.reporter_id ?? null,
  target_owner_id: r.target_owner_id ?? null,
  handled_by: r.handled_by ?? null,
  created_at: r.created_at?.toISOString?.() ?? '',
  updated_at: r.updated_at?.toISOString?.() ?? '',
});

/**
 * Everything a set of reports needs from other collections, in three queries
 * however many reports there are: which posts are still up, how many people
 * reported each target, and what each category is called today.
 */
async function contextFor(docs: readonly IContentReport[]): Promise<ReportContext> {
  const postIds = docs.filter((d) => POST_TARGETS.has(d.target_type)).map((d) => d.target_id.toString());
  const targetIds = docs.map((d) => d.target_id);
  const [live, grouped, labels] = await Promise.all([
    postService.liveIds(postIds),
    ContentReportModel.aggregate<{ _id: { type: ReportTargetType; id: Types.ObjectId }; count: number }>([
      { $match: { target_id: { $in: targetIds } } },
      { $group: { _id: { type: '$target_type', id: '$target_id' }, count: { $sum: 1 } } },
    ]),
    reportCategoryService.labelMap(),
  ]);
  const counts = new Map(
    grouped.map((g) => [targetKey({ target_type: g._id.type, target_id: g._id.id }), g.count])
  );
  return { live, counts, labels };
}

const pubOne = async (doc: IContentReport) => toPub(doc, await contextFor([doc]));

/**
 * Allowlists for the shared table engine (contentReportsTable — DUNCIT TABLE
 * CONTRACT v1). The handle leads because it is what a reviewer quotes back.
 */
const REPORT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['report_no', 'target_caption', 'details'],
  sortFields: {
    report_no: 'report_no',
    target_type: 'target_type',
    reason: 'reason',
    status: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    report_no: { type: 'string' },
    target_type: { type: 'enum' },
    reason: { type: 'enum' },
    status: { type: 'enum' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  // Newest first: a report is acted on while the thing it names is still up.
  defaultSort: { created_at: -1 },
};

/** What the reporting surface hands over about the thing being reported. */
export interface ReportTargetSnapshot {
  target_type: ReportTargetType;
  target_id: string;
  target_owner_id?: string | null;
  club_id?: string | null;
  target_preview_url?: string;
  target_caption?: string;
}

const toOid = (value: string | null | undefined) =>
  value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;

async function findOrFail(id: string): Promise<IContentReport> {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid report id');
  const doc = await ContentReportModel.findById(id);
  if (!doc) fail('NOT_FOUND', 'Report not found');
  return doc;
}

function cleanNote(value: string | null | undefined): string {
  const note = (value ?? '').trim();
  if (note.length > NOTE_MAX) fail('BAD_USER_INPUT', 'That note is too long');
  return note;
}

function logAction(doc: IContentReport, action: ReportActionType, by: string, note: string) {
  doc.history.push({
    _id: new Types.ObjectId(),
    action,
    by: new Types.ObjectId(by),
    at: new Date(),
    note,
  });
  doc.handled_by = new Types.ObjectId(by);
}

interface Verdict {
  status: 'ACTIONED' | 'DISMISSED';
  action: 'TAKEN_DOWN' | 'LOOKS_GOOD';
  note: string;
  removed: boolean;
}

/**
 * Apply one verdict to EVERY report on the same piece of content.
 *
 * A verdict is about the content, not about one person's complaint: five
 * people reporting a post Legal takes down are five reports answered, and
 * leaving four of them open would have a reviewer re-deciding something that
 * no longer exists. A report somebody already closed keeps its own outcome —
 * only the one the reviewer acted on and the still-open ones move.
 */
async function closeTarget(acted: IContentReport, handlerId: string, verdict: Verdict) {
  const siblings = await ContentReportModel.find({
    target_type: acted.target_type,
    target_id: acted.target_id,
  });
  const now = new Date();
  const moved = siblings.filter(
    (doc) => doc.id === acted.id || OPEN_STATUSES.has(doc.status)
  );
  for (const doc of moved) {
    doc.status = verdict.status;
    doc.resolved_at = now;
    if (verdict.note) doc.resolution = verdict.note;
    logAction(doc, verdict.action, handlerId, verdict.note);
  }
  // Gone is gone for every report on it, closed or not.
  if (verdict.removed) {
    for (const doc of siblings) doc.target_removed_at = now;
  }
  await Promise.all((verdict.removed ? siblings : moved).map((doc) => doc.save()));
  return moved.length;
}

export const reportService = {
  /**
   * File a report, or update the one this reporter already filed.
   *
   * A repeat report is an edit, never a second row — the unique index on
   * (reporter, type, target) is what makes the queue a count of PEOPLE who
   * objected rather than a count of taps. `report_no` is minted once, on the
   * first filing, so the handle a reviewer already has stays valid.
   */
  async submit(
    reporterId: string,
    snapshot: ReportTargetSnapshot,
    input: { reason?: string; details?: string | null }
  ) {
    if (!REPORT_TARGET_TYPES.includes(snapshot.target_type)) {
      fail('BAD_USER_INPUT', 'Unknown report target');
    }
    const targetId = toOid(snapshot.target_id);
    if (!targetId) fail('BAD_USER_INPUT', 'Invalid target id');
    // Reporting your own content has no reviewer on the other end of it: the
    // owner already has Delete.
    if (snapshot.target_owner_id === reporterId) {
      fail('BAD_USER_INPUT', 'You cannot report your own content');
    }

    const category = await reportCategoryService.requireActive(input.reason);
    const details = (input.details ?? '').trim();
    if (details.length > DETAILS_MAX) fail('BAD_USER_INPUT', 'Please shorten your description');
    // A catch-all category carries no meaning on its own — without the words
    // there is nothing for a reviewer to act on.
    if (category.requires_details && !details) {
      fail('BAD_USER_INPUT', 'Tell us what is wrong with this content');
    }

    const doc = await ContentReportModel.findOne({
      reporter_id: new Types.ObjectId(reporterId),
      target_type: snapshot.target_type,
      target_id: targetId,
    });

    if (doc) {
      doc.reason = category.key;
      doc.details = details;
      await doc.save();
      return { id: String(doc.id), report_no: doc.report_no ?? '' };
    }

    const created = await ContentReportModel.create({
      target_type: snapshot.target_type,
      target_id: targetId,
      target_owner_id: toOid(snapshot.target_owner_id),
      club_id: toOid(snapshot.club_id),
      target_preview_url: snapshot.target_preview_url ?? '',
      target_caption: snapshot.target_caption ?? '',
      reason: category.key,
      details,
      reporter_id: new Types.ObjectId(reporterId),
    });
    logs.server.info('report.service', 'submit', {
      report_no: created.report_no,
      target_type: created.target_type,
      reason: created.reason,
    });
    return { id: String(created.id), report_no: created.report_no ?? '' };
  },

  async table(input?: TableQueryInput) {
    const { docs, total, page, page_size } = await runTableQuery<IContentReport>(
      ContentReportModel,
      {},
      input,
      REPORT_TABLE_CONFIG
    );
    const ctx = await contextFor(docs);
    return { rows: docs.map((doc) => toPub(doc, ctx)), total, page, page_size };
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid report id');
    const doc = await ContentReportModel.findById(id);
    return doc ? pubOne(doc) : null;
  },

  async stats() {
    const grouped = await ContentReportModel.aggregate<{ _id: ReportStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = new Map(grouped.map((g) => [g._id, g.count]));
    const total = grouped.reduce((sum, g) => sum + g.count, 0);
    return {
      total,
      by_status: REPORT_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 })),
    };
  },

  /**
   * Move a report along by hand, and record who moved it.
   *
   * `resolved_at` is stamped the first time it reaches an end state and
   * cleared if it is reopened, so "how long did this take" stays answerable
   * from the record itself.
   */
  async updateStatus(
    handlerId: string,
    id: string,
    input: { status?: string | null; resolution?: string | null }
  ) {
    const doc = await findOrFail(id);

    if (typeof input.resolution === 'string') doc.resolution = cleanNote(input.resolution);
    if (input.status) {
      const status = String(input.status).toUpperCase() as ReportStatus;
      if (!REPORT_STATUSES.includes(status)) fail('BAD_USER_INPUT', 'Unknown report status');
      if (status !== doc.status) logAction(doc, 'STATUS_CHANGED', handlerId, status);
      doc.status = status;
      const closed = CLOSED_STATUSES.has(status);
      if (closed && !doc.resolved_at) doc.resolved_at = new Date();
      if (!closed) doc.resolved_at = null;
    }
    doc.handled_by = new Types.ObjectId(handlerId);
    await doc.save();
    return pubOne(doc);
  },

  /**
   * Take the reported content down, for everyone, and close its reports.
   *
   * The content is removed first and the reports closed second: a report
   * marked "taken down" while the post is still up is the worse of the two
   * half-finished states. Content that is already gone — an expired story, a
   * post its author deleted — is refused rather than recorded as a take-down
   * that never happened; its reports are closed by hand from the status. The
   * snapshot on each report is what stays as the record of what it was.
   */
  async takeDown(handlerId: string, id: string, note?: string | null) {
    const doc = await findOrFail(id);
    if (!POST_TARGETS.has(doc.target_type)) {
      fail('BAD_USER_INPUT', 'This kind of content cannot be taken down from here');
    }
    if (doc.target_removed_at) fail('CONFLICT', 'This content has already been taken down');

    const removed = await postService.takeDown(doc.target_id.toString());
    if (!removed) fail('CONFLICT', 'This content is already gone, so there is nothing to take down');
    const closed = await closeTarget(doc, handlerId, {
      status: 'ACTIONED',
      action: 'TAKEN_DOWN',
      note: cleanNote(note),
      removed: true,
    });
    logs.server.info('report.service', 'takeDown', {
      report_no: doc.report_no,
      target_type: doc.target_type,
      closed,
    });
    return this.getById(id);
  },

  /** The content is fine: close every open report on it as dismissed. */
  async markOk(handlerId: string, id: string, note?: string | null) {
    const doc = await findOrFail(id);
    if (doc.target_removed_at) {
      fail('CONFLICT', 'This content was taken down, so it cannot be marked as fine');
    }
    await closeTarget(doc, handlerId, {
      status: 'DISMISSED',
      action: 'LOOKS_GOOD',
      note: cleanNote(note),
      removed: false,
    });
    return this.getById(id);
  },

  /**
   * Write to the reporter or to the content's owner, and log that we did.
   *
   * The address is read from the account here rather than sent by the portal,
   * so the table never has to carry anybody's email and a reviewer cannot
   * redirect a legal notice to an address of their choosing.
   */
  async sendMail(
    handlerId: string,
    id: string,
    input: { recipient: ReportMailRecipient; subject: string; message: string }
  ) {
    const doc = await findOrFail(id);
    const subject = (input.subject ?? '').trim();
    const message = (input.message ?? '').trim();
    if (!subject) fail('BAD_USER_INPUT', 'Add a subject');
    if (subject.length > SUBJECT_MAX) fail('BAD_USER_INPUT', 'Keep the subject under 150 characters');
    if (!message) fail('BAD_USER_INPUT', 'Write a message');
    if (message.length > NOTE_MAX) fail('BAD_USER_INPUT', 'That message is too long');

    const toReporter = input.recipient === 'REPORTER';
    const userId = toReporter ? doc.reporter_id : doc.target_owner_id;
    const user = userId
      ? await UserModel.findById(userId).select('auth.email profile.first_name').lean<{
          auth?: { email?: string };
          profile?: { first_name?: string };
        }>()
      : null;
    const to = user?.auth?.email?.trim();
    if (!to) fail('BAD_USER_INPUT', 'This person has no email address on their account');

    const refused = await sendContentReportMessage({
      to,
      name: user?.profile?.first_name?.trim() || 'there',
      report_no: doc.report_no ?? '',
      subject,
      message,
    });
    if (refused) fail('INTERNAL_SERVER_ERROR', refused);

    // Subject and body together: the log is what answers "what did we tell them?".
    logAction(doc, toReporter ? 'MAIL_REPORTER' : 'MAIL_OWNER', handlerId, `${subject}\n\n${message}`);
    await doc.save();
    return pubOne(doc);
  },
};
