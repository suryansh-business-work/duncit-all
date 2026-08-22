import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { findStatusService, getStatusEnvironment } from '@observability/statusServices';
import type { CaptchaCarrier } from '@modules/platform/captcha/captcha.guard';
import { uploadReportImages, type StatusReportImageInput } from './statusReport.images';
import {
  StatusReportModel,
  STATUS_REPORT_IMPACTS,
  type IStatusReport,
  type StatusReportImpact,
  type StatusReportStatus,
} from './statusReport.model';

/**
 * The form is public, so this schema is the whole boundary between a stranger's
 * keyboard and the database. Every field is capped, the email is parsed rather
 * than pattern-guessed, and the service key is checked against the catalogue —
 * an unknown slug becomes "not sure" instead of a row nobody can group.
 */
const submitSchema = yup.object({
  service_key: yup.string().trim().max(60).default(''),
  impact: yup
    .string()
    .oneOf(STATUS_REPORT_IMPACTS)
    .default('OTHER'),
  name: yup.string().trim().required('Name is required').max(120),
  email: yup.string().trim().required('Email is required').email('Invalid email').max(160),
  page_url: yup.string().trim().max(500).default(''),
  message: yup.string().trim().required('Message is required').min(10).max(4000),
});

/** Who sent it, as the SERVER read the request — never as the body claimed. */
export interface StatusReportOrigin {
  ip?: string | null;
  user_agent?: string | null;
  user_id?: string | null;
}

export interface SubmitStatusReportInput extends CaptchaCarrier {
  service_key?: string | null;
  impact?: string | null;
  name: string;
  email: string;
  page_url?: string | null;
  message: string;
  images?: StatusReportImageInput[] | null;
}

const toPub = (doc: IStatusReport) => ({
  id: String(doc._id),
  service_key: doc.service_key || '',
  service_name: doc.service_name || '',
  service_url: doc.service_url || '',
  impact: doc.impact,
  name: doc.name,
  email: doc.email,
  page_url: doc.page_url || '',
  message: doc.message,
  environment: doc.environment,
  status: doc.status,
  ip: doc.ip ?? null,
  user_agent: doc.user_agent ?? null,
  user_id: doc.user_id ?? null,
  image_urls: doc.image_urls ?? [],
  staff_image_urls: doc.staff_image_urls ?? [],
  note: doc.note || '',
  created_at: doc.created_at.toISOString(),
  updated_at: doc.updated_at.toISOString(),
});

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). */
const STATUS_REPORT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'email', 'service_name', 'message', 'page_url'],
  sortFields: {
    name: 'name',
    email: 'email',
    service_name: 'service_name',
    impact: 'impact',
    environment: 'environment',
    status: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    status: { type: 'enum' },
    impact: { type: 'enum' },
    environment: { type: 'enum' },
    service_key: { type: 'string' },
    email: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** An operator attaching more than this to one report is filing a ticket, not triaging. */
const STAFF_IMAGE_MAX = 10;

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

export const statusReportService = {
  /**
   * Record one report from the public status page.
   *
   * Deliberately never throws for anything but bad input: the reporter is
   * already having a bad day, and a 500 on the "tell us what broke" form is the
   * worst possible last impression.
   */
  async submit(input: SubmitStatusReportInput, origin: StatusReportOrigin = {}) {
    let payload: yup.InferType<typeof submitSchema>;
    try {
      payload = await submitSchema.validate(input, { abortEarly: false });
    } catch (error) {
      const message = error instanceof yup.ValidationError ? error.errors[0] : 'Invalid input';
      throw badInput(message ?? 'Invalid input');
    }

    // An unknown slug is treated as "not sure" rather than rejected: the
    // catalogue changes with deploys, and a stale dropdown must not lose a
    // report that is otherwise perfectly good.
    const service = payload.service_key ? findStatusService(payload.service_key) : null;

    // Uploaded before the row is written so the report carries its screenshots
    // from the moment it appears in Tech — never a row that grows a picture a
    // few seconds after somebody has already read and closed it.
    const image_urls = await uploadReportImages(input.images);

    const doc = await StatusReportModel.create({
      service_key: service?.key ?? '',
      service_name: service?.name ?? '',
      service_url: service?.url ?? '',
      image_urls,
      impact: payload.impact as StatusReportImpact,
      name: payload.name,
      email: payload.email,
      page_url: payload.page_url,
      message: payload.message,
      environment: getStatusEnvironment(),
      ip: origin.ip ?? null,
      user_agent: origin.user_agent ?? null,
      user_id: origin.user_id ?? null,
    });

    return { ok: true, id: String(doc._id) };
  },

  /** Server-side table page for the Tech portal's Status Reports section. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IStatusReport>(
      StatusReportModel,
      {},
      input,
      STATUS_REPORT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async updateStatus(
    id: string,
    status: StatusReportStatus,
    note?: string | null,
    staffImages?: string[] | null
  ) {
    const update: Record<string, unknown> = { status };
    if (typeof note === 'string') update.note = note.slice(0, 2000);
    // Absent means "leave them alone"; an empty array means "remove them all".
    if (Array.isArray(staffImages)) {
      update.staff_image_urls = staffImages
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, STAFF_IMAGE_MAX);
    }
    const doc = await StatusReportModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!doc) throw new GraphQLError('Status report not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },

  async remove(ids: string[]) {
    if (ids.length === 0) return 0;
    const result = await StatusReportModel.deleteMany({ _id: { $in: ids } });
    return result.deletedCount ?? 0;
  },
};
