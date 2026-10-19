import { GraphQLError } from 'graphql';
import type { PipelineStage, Types } from 'mongoose';
import { PaymentReleaseModel } from './paymentRelease.model';
import { releaseGroupFilter, toPub } from './paymentRelease.service';
import {
  runTableAggregate,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

/**
 * Payment Release, one row per pod request.
 *
 * Completing a pod asks for several payouts at once — the host's, the venue's,
 * the club admin's, each product seller's — and Finance decides them together,
 * so the list shows the REQUEST and the page behind it shows the payouts.
 *
 * A request is the releases sharing a `batch_id`. Releases written before
 * batches existed (and manual ones) have none, and group by their pod instead.
 */
const GROUP_STAGES: PipelineStage[] = [
  { $sort: { created_at: 1 } },
  {
    $group: {
      _id: { $ifNull: ['$batch_id', { $toString: '$pod_id' }] },
      pod_id: { $first: '$pod_id' },
      pod_title: { $first: '$pod_title' },
      total_requested: { $sum: '$amount_requested' },
      release_count: { $sum: 1 },
      kinds: { $addToSet: '$kind' },
      statuses: { $addToSet: '$status' },
      // Kept only so one search box can find a request by any of its payouts.
      release_ids: { $push: '$release_id' },
      beneficiary_names: { $push: '$beneficiary_name' },
      beneficiary_emails: { $push: '$beneficiary_email' },
      bills: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$bill_url', ''] } }, 0] }, 1, 0] } },
      media_count: { $sum: { $size: { $ifNull: ['$evidence_media', []] } } },
      requested_at: { $max: '$requested_at' },
      created_at: { $max: '$created_at' },
    },
  },
  {
    $addFields: {
      // A request is waiting while ANY payout on it is; settled once one was
      // paid; rejected only when Finance turned every payout down.
      // `$cond` in its array form: [if, then, else], checked in this order.
      status: {
        $cond: [
          { $in: ['PENDING', '$statuses'] },
          'PENDING',
          { $cond: [{ $in: ['APPROVED', '$statuses'] }, 'APPROVED', 'REJECTED'] },
        ],
      },
    },
  },
];

/** Allowlists for the shared table engine, over the GROUPED rows. */
const GROUP_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'release_ids', 'beneficiary_names', 'beneficiary_emails'],
  sortFields: {
    pod_title: 'pod_title',
    status: 'status',
    total_requested: 'total_requested',
    release_count: 'release_count',
    requested_at: 'requested_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    kinds: { type: 'enum' },
    pod_title: { type: 'string' },
    total_requested: { type: 'number' },
    requested_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** One grouped row as GROUP_STAGES leaves it. */
interface GroupDoc {
  _id: string;
  pod_id: Types.ObjectId;
  pod_title?: string;
  status: string;
  total_requested: number;
  release_count?: number;
  kinds?: string[];
  bills?: number;
  media_count?: number;
  requested_at?: Date | null;
}

function toGroupRow(row: GroupDoc) {
  return {
    id: row._id,
    pod_id: row.pod_id.toString(),
    pod_title: row.pod_title ?? '',
    status: row.status,
    total_requested: round2(row.total_requested),
    release_count: row.release_count ?? 0,
    // $addToSet keeps no order — sorted so the list and the page agree.
    kinds: [...(row.kinds ?? [])].sort((a, b) => a.localeCompare(b)),
    has_bill: (row.bills ?? 0) > 0,
    media_count: row.media_count ?? 0,
    requested_at: row.requested_at?.toISOString() ?? '',
  };
}

export const paymentReleaseGroupService = {
  /**
   * Server-side table page of pod requests.
   *
   * The roll-up runs before the page is cut: a request's status and total only
   * exist once its payouts are grouped, and both are sortable and filterable.
   * That reads the whole collection per page — a handful of rows per completed
   * pod, on an indexed key. The lever if it ever gets slow is a stored request
   * document written at completion.
   */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableAggregate<GroupDoc>(
      PaymentReleaseModel,
      GROUP_STAGES,
      input,
      GROUP_TABLE_CONFIG
    );
    return { rows: docs.map(toGroupRow), total, page, page_size };
  },

  /** One request with every payout on it — the Payment Release page. The
   * summary comes from the same roll-up as the list, so the two cannot quote
   * different totals or a different status. */
  async detail(groupId: string) {
    const filter = releaseGroupFilter(String(groupId ?? ''));
    const [docs, rows] = await Promise.all([
      PaymentReleaseModel.find(filter).sort({ created_at: 1 }),
      PaymentReleaseModel.aggregate<GroupDoc>([{ $match: filter }, ...GROUP_STAGES]),
    ]);
    if (docs.length === 0 || rows.length === 0) {
      throw new GraphQLError('Payment release request not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    return { summary: toGroupRow(rows[0]), releases: docs.map(toPub) };
  },
};
