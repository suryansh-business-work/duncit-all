import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  ContentReportModel,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type IContentReport,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
} from './contentReport.model';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const toPub = (r: IContentReport) => ({
  id: String(r._id),
  report_no: r.report_no ?? '',
  target_type: r.target_type,
  target_id: String(r.target_id),
  club_id: r.club_id ? String(r.club_id) : null,
  target_preview_url: r.target_preview_url ?? '',
  target_caption: r.target_caption ?? '',
  reason: r.reason,
  details: r.details ?? '',
  status: r.status,
  resolution: r.resolution ?? '',
  resolved_at: r.resolved_at ? r.resolved_at.toISOString() : null,
  // The ids the ContentReport field resolvers turn into names.
  reporter_id: r.reporter_id ?? null,
  target_owner_id: r.target_owner_id ?? null,
  handled_by: r.handled_by ?? null,
  created_at: r.created_at?.toISOString?.() ?? '',
  updated_at: r.updated_at?.toISOString?.() ?? '',
});

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
    target_type: { type: 'string' },
    reason: { type: 'string' },
    status: { type: 'string' },
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
    input: { reason?: string; details?: string }
  ) {
    if (!REPORT_TARGET_TYPES.includes(snapshot.target_type)) {
      fail('BAD_USER_INPUT', 'Unknown report target');
    }
    const targetId = toOid(snapshot.target_id);
    if (!targetId) fail('BAD_USER_INPUT', 'Invalid target id');

    const reason = String(input.reason ?? '').toUpperCase() as ReportReason;
    if (!REPORT_REASONS.includes(reason)) fail('BAD_USER_INPUT', 'Pick a reason for the report');
    const details = (input.details ?? '').trim();
    if (details.length > 2000) fail('BAD_USER_INPUT', 'Please shorten your description');
    // OTHER carries no meaning on its own — without the words there is nothing
    // for a reviewer to act on.
    if (reason === 'OTHER' && !details) {
      fail('BAD_USER_INPUT', 'Tell us what is wrong with this content');
    }

    const doc = await ContentReportModel.findOne({
      reporter_id: new Types.ObjectId(reporterId),
      target_type: snapshot.target_type,
      target_id: targetId,
    });

    if (doc) {
      doc.reason = reason;
      doc.details = details;
      await doc.save();
      return toPub(doc);
    }

    const created = await ContentReportModel.create({
      target_type: snapshot.target_type,
      target_id: targetId,
      target_owner_id: toOid(snapshot.target_owner_id),
      club_id: toOid(snapshot.club_id),
      target_preview_url: snapshot.target_preview_url ?? '',
      target_caption: snapshot.target_caption ?? '',
      reason,
      details,
      reporter_id: new Types.ObjectId(reporterId),
    });
    logs.server.info('report.service', 'submit', {
      report_no: created.report_no,
      target_type: created.target_type,
      reason: created.reason,
    });
    return toPub(created);
  },

  async table(input?: TableQueryInput) {
    const { docs, total, page, page_size } = await runTableQuery<IContentReport>(
      ContentReportModel,
      {},
      input,
      REPORT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid report id');
    const doc = await ContentReportModel.findById(id);
    return doc ? toPub(doc) : null;
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
   * Move a report along, and record who moved it.
   *
   * `resolved_at` is stamped the first time it reaches an end state and
   * cleared if it is reopened, so "how long did this take" stays answerable
   * from the record itself.
   */
  async updateStatus(
    handlerId: string,
    id: string,
    input: { status?: string; resolution?: string }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid report id');
    const doc = await ContentReportModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Report not found');

    if (input.status !== undefined) {
      const status = String(input.status).toUpperCase() as ReportStatus;
      if (!REPORT_STATUSES.includes(status)) fail('BAD_USER_INPUT', 'Unknown report status');
      doc.status = status;
      const closed = status === 'ACTIONED' || status === 'DISMISSED';
      if (closed && !doc.resolved_at) doc.resolved_at = new Date();
      if (!closed) doc.resolved_at = null;
    }
    if (input.resolution !== undefined) {
      const resolution = String(input.resolution).trim();
      if (resolution.length > 5000) fail('BAD_USER_INPUT', 'Resolution is too long');
      doc.resolution = resolution;
    }
    doc.handled_by = new Types.ObjectId(handlerId);
    await doc.save();
    return toPub(doc);
  },
};
