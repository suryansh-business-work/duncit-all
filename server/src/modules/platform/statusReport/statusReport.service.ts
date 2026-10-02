import { z } from 'zod';
import { GraphQLError } from 'graphql';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { email, filled, maxLen, minLen, obj, shape, str, trim } from '@utils/zod-fields';
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
const requiredText = (message: string, ...checks: z.core.$ZodCheck<string>[]) =>
  str(z.string().check(filled(message), ...checks), { required: message, transforms: [trim] });

// `loose`: keys beyond these (the captcha, the images) ride through untouched.
const submitSchema = obj(
  shape(
    {
      service_key: str(z.string().check(maxLen(60)), { transforms: [trim], default: '' }),
      impact: str(z.string(), {
        oneOf: STATUS_REPORT_IMPACTS,
        default: 'OTHER',
      }),
      name: requiredText('Name is required', maxLen(120)),
      email: requiredText('Email is required', email('Invalid email'), maxLen(160)),
      page_url: str(z.string().check(maxLen(500)), { transforms: [trim], default: '' }),
      message: requiredText('Message is required', minLen(10), maxLen(4000)),
    },
    { loose: true }
  )
);

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
    service_url: 'service_url',
    message: 'message',
  },
  filterFields: {
    status: { type: 'enum' },
    impact: { type: 'enum' },
    environment: { type: 'enum' },
    service_key: { type: 'string' },
    email: { type: 'string' },
    created_at: { type: 'date' },
    service_name: { type: 'string' },
    service_url: { type: 'string' },
    name: { type: 'string' },
    message: { type: 'string' },
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
    let parsed: z.ZodSafeParseResult<z.infer<typeof submitSchema>>;
    try {
      parsed = await submitSchema.safeParseAsync(input);
    } catch {
      // A value the trim could not read — refused, never a 500.
      throw badInput('Invalid input');
    }
    if (!parsed.success) throw badInput(parsed.error.issues[0]?.message ?? 'Invalid input');
    const payload = parsed.data;

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
