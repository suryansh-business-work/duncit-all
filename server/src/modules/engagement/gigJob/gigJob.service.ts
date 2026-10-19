import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { escapedSearchRegex } from '@utils/table-query';
import { validate } from '@utils/validate';
import { logs } from '@observability/log';
import {
  FreelancerProfileModel,
  GIG_JOB_STATUSES,
  GIG_POSTER_ROLES,
  GigInterestModel,
  GigJobModel,
  type GigEventType,
  type GigJobStatus,
  type IFreelancerProfile,
  type IGigInterest,
  type IGigJob,
} from './gigJob.model';
import { gigInterestInputSchema, gigJobInputSchema, type GigJobInput } from './gigJob.validator';
import { categoryTitles, gigCategoryService } from './gigCategory.service';
import { accountContact } from './gigContact';

const fail = (code: string, message: string) => new GraphQLError(message, { extensions: { code } });

const PAGE_DEFAULT = 20;
const PAGE_MAX = 50;

export interface GigJobFilter {
  category_id?: string | null;
  city?: string | null;
  search?: string | null;
  event_type?: GigEventType | null;
}

interface RowContext {
  viewerId: string;
  titles: Map<string, string>;
  interested: Set<string>;
}

const iso = (value: Date | null | undefined) => value?.toISOString?.() ?? null;

/**
 * Whose eyes the poster's contact is for: the poster, and a freelancer who has
 * said they are interested. Free for now — this is the one gate a future paid
 * unlock replaces, so no other read hands the contact out.
 */
const contactVisibleTo = (job: IGigJob, ctx: RowContext) =>
  String(job.poster_user_id) === ctx.viewerId || ctx.interested.has(String(job._id));

function toGigJob(job: IGigJob, ctx: RowContext) {
  const id = String(job._id);
  return {
    id,
    title: job.title,
    description: job.description ?? '',
    category_id: String(job.category_id),
    category_title: ctx.titles.get(String(job.category_id)) ?? '',
    roles: job.roles ?? [],
    event_type: job.event_type,
    event_date: iso(job.event_date),
    city: job.city ?? '',
    location: job.location ?? '',
    budget: job.budget ?? null,
    openings: job.openings ?? 1,
    status: job.status,
    poster_role: job.poster_role,
    poster_name: job.poster_name ?? '',
    interest_count: job.interest_count ?? 0,
    is_mine: String(job.poster_user_id) === ctx.viewerId,
    viewer_interested: ctx.interested.has(id),
    contact: contactVisibleTo(job, ctx)
      ? { name: job.contact_name ?? '', phone: job.contact_phone ?? '', email: job.contact_email ?? '' }
      : null,
    created_at: iso(job.created_at) ?? '',
    updated_at: iso(job.updated_at) ?? '',
  };
}

const toGigInterest = (row: IGigInterest) => ({
  id: String(row._id),
  job_id: String(row.job_id),
  freelancer_name: row.freelancer_name ?? '',
  skills: row.skills ?? [],
  message: row.message ?? '',
  contact: { name: row.freelancer_name ?? '', phone: row.freelancer_phone ?? '', email: row.freelancer_email ?? '' },
  created_at: iso(row.created_at) ?? '',
});

const pageOf = (offset?: number | null, limit?: number | null) => ({
  skip: Math.max(0, Math.floor(offset ?? 0)),
  take: Math.min(PAGE_MAX, Math.max(1, Math.floor(limit ?? PAGE_DEFAULT))),
});

/** Labels + the viewer's interest for a page of gigs: two reads, whatever the page size. */
async function rowsFor(viewerId: string, jobs: IGigJob[]) {
  const ids = jobs.map((job) => job._id as Types.ObjectId);
  const [titles, mine] = await Promise.all([
    categoryTitles(jobs.map((job) => job.category_id)),
    ids.length && Types.ObjectId.isValid(viewerId)
      ? GigInterestModel.find({ freelancer_user_id: new Types.ObjectId(viewerId), job_id: { $in: ids } })
          .select('job_id')
          .lean()
      : Promise.resolve([]),
  ]);
  const ctx: RowContext = { viewerId, titles, interested: new Set(mine.map((row) => String(row.job_id))) };
  return jobs.map((job) => toGigJob(job, ctx));
}

function boardQuery(filter: GigJobFilter = {}) {
  const query: Record<string, unknown> = { status: 'OPEN' };
  if (filter.category_id && Types.ObjectId.isValid(filter.category_id)) {
    query.category_id = new Types.ObjectId(filter.category_id);
  }
  if (filter.event_type) query.event_type = filter.event_type;
  const city = filter.city?.trim();
  if (city) query.city = new RegExp(`^${escapedSearchRegex(city).source}$`, 'i');
  const search = filter.search?.trim();
  if (search) {
    const re = escapedSearchRegex(search);
    query.$or = [{ title: re }, { description: re }, { roles: re }];
  }
  return query;
}

async function posterRolesOf(userId: string): Promise<string[]> {
  const roles = await effectiveRoleKeys(userId);
  return GIG_POSTER_ROLES.filter((role) => roles.includes(role));
}

async function ownJob(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw fail('NOT_FOUND', 'Gig not found');
  const job = await GigJobModel.findById(id);
  if (!job) throw fail('NOT_FOUND', 'Gig not found');
  if (String(job.poster_user_id) !== userId) throw fail('FORBIDDEN', 'Only the poster can change this gig');
  return job;
}

/** The validated input, with the poster's right to post as that role checked server-side. */
async function postable(userId: string, raw: unknown, keepCategoryId?: string) {
  const input: GigJobInput = await validate(gigJobInputSchema, raw);
  const roles = await posterRolesOf(userId);
  if (!roles.includes(input.poster_role)) {
    throw fail('FORBIDDEN', 'Only hosts, venue owners and brand owners can post gigs');
  }
  // Editing a gig may keep a category an admin has since switched off.
  if (input.category_id !== keepCategoryId) await gigCategoryService.requireActive(input.category_id);
  return {
    ...input,
    category_id: new Types.ObjectId(input.category_id),
    event_date: input.event_date ? new Date(input.event_date) : null,
    budget: input.budget ?? null,
  };
}

async function notifyPoster(job: IGigJob, freelancerName: string) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({
      title: 'New interest in your gig',
      body: `${freelancerName || 'A freelancer'} is interested in "${job.title}". Their contact is on the gig.`,
      image_url: null,
      link_url: `/gigs/${String(job._id)}`,
      scope: 'USER',
      target_user_ids: [String(job.poster_user_id)],
      silent: false,
    });
  } catch (err) {
    logs.server.error('gigJob', 'notifyPoster', { error: err, msg: 'in-app notification failed', jobId: String(job._id) });
  }
}

async function findRow(viewerId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  const job = await GigJobModel.findById(id);
  if (!job) return null;
  const [row] = await rowsFor(viewerId, [job]);
  return row;
}

type FreelancerSnapshot = Pick<
  IFreelancerProfile,
  'user_id' | 'display_name' | 'contact_phone' | 'contact_email' | 'skills'
>;

/** Writes the interest, counts it and tells the poster — once per freelancer per gig. */
async function recordInterest(job: IGigJob, profile: FreelancerSnapshot, message: string) {
  try {
    await GigInterestModel.create({
      job_id: job._id,
      poster_user_id: job.poster_user_id,
      freelancer_user_id: profile.user_id,
      freelancer_name: profile.display_name,
      freelancer_phone: profile.contact_phone,
      freelancer_email: profile.contact_email,
      skills: profile.skills,
      message,
    });
  } catch (err) {
    // A concurrent duplicate lost the race to the unique index — already shared.
    if ((err as { code?: number }).code === 11000) return;
    throw err;
  }
  await GigJobModel.updateOne({ _id: job._id }, { $inc: { interest_count: 1 } });
  await notifyPoster(job, profile.display_name);
}

/** The row a write just changed, as its author now sees it. */
async function readBack(viewerId: string, id: string) {
  const row = await findRow(viewerId, id);
  if (!row) throw fail('NOT_FOUND', 'Gig not found');
  return row;
}

export const gigJobService = {
  async board(viewerId: string, filter?: GigJobFilter, offset?: number | null, limit?: number | null) {
    const { skip, take } = pageOf(offset, limit);
    const query = boardQuery(filter);
    const [jobs, total] = await Promise.all([
      GigJobModel.find(query).sort({ created_at: -1 }).skip(skip).limit(take),
      GigJobModel.countDocuments(query),
    ]);
    return { rows: await rowsFor(viewerId, jobs), total };
  },

  async mine(viewerId: string, offset?: number | null, limit?: number | null) {
    const { skip, take } = pageOf(offset, limit);
    const query = { poster_user_id: new Types.ObjectId(viewerId) };
    const [jobs, total] = await Promise.all([
      GigJobModel.find(query).sort({ created_at: -1 }).skip(skip).limit(take),
      GigJobModel.countDocuments(query),
    ]);
    return { rows: await rowsFor(viewerId, jobs), total };
  },

  get: findRow,

  async create(userId: string, raw: unknown) {
    const values = await postable(userId, raw);
    const account = await accountContact(userId);
    const job = await GigJobModel.create({
      ...values,
      poster_user_id: new Types.ObjectId(userId),
      poster_name: account.name,
      status: 'OPEN',
    });
    logs.server.info('gigJob', 'create', { jobId: String(job._id), role: values.poster_role });
    return readBack(userId, String(job._id));
  },

  async update(userId: string, id: string, raw: unknown) {
    const job = await ownJob(userId, id);
    const values = await postable(userId, raw, String(job.category_id));
    job.set(values);
    await job.save();
    return readBack(userId, id);
  },

  async setStatus(userId: string, id: string, status: GigJobStatus) {
    if (!GIG_JOB_STATUSES.includes(status)) throw fail('BAD_USER_INPUT', 'Unknown status');
    const job = await ownJob(userId, id);
    job.status = status;
    await job.save();
    return readBack(userId, id);
  },

  async interests(userId: string, jobId: string) {
    const job = await ownJob(userId, jobId);
    const rows = await GigInterestModel.find({ job_id: job._id }).sort({ created_at: -1 }).limit(500);
    return rows.map(toGigInterest);
  },

  /**
   * "I'm interested": shares the freelancer's contact with the poster and the
   * poster's with the freelancer. Idempotent — the unique index on
   * (job, freelancer) means a retry or double tap neither counts nor notifies twice.
   */
  async expressInterest(userId: string, jobId: string, raw: unknown) {
    const { message } = await validate(gigInterestInputSchema, raw ?? {});
    if (!Types.ObjectId.isValid(jobId)) throw fail('NOT_FOUND', 'Gig not found');
    const job = await GigJobModel.findById(jobId);
    if (!job) throw fail('NOT_FOUND', 'Gig not found');
    if (String(job.poster_user_id) === userId) throw fail('BAD_USER_INPUT', 'This is your own gig');
    const profile = await FreelancerProfileModel.findOne({ user_id: new Types.ObjectId(userId) }).lean();
    if (!profile) throw fail('FORBIDDEN', 'Join as a freelancer in Earn with Duncit first');
    const already = await GigInterestModel.exists({ job_id: job._id, freelancer_user_id: profile.user_id });
    if (!already) {
      if (job.status !== 'OPEN') throw fail('BAD_USER_INPUT', 'This gig is closed');
      await recordInterest(job, profile, message ?? '');
    }
    return readBack(userId, jobId);
  },

  /** What the viewer may do on the board, and the contact a new post starts from. */
  async viewer(userId: string) {
    const [poster_roles, profile, default_contact] = await Promise.all([
      posterRolesOf(userId),
      FreelancerProfileModel.exists({ user_id: new Types.ObjectId(userId) }),
      accountContact(userId),
    ]);
    return { poster_roles, is_freelancer: !!profile, default_contact };
  },
};
