import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';
import {
  FreelancerProfileModel,
  GIG_JOB_STATUSES,
  GigCategoryModel,
  GigInterestModel,
  GigJobModel,
  type GigJobStatus,
  type IFreelancerProfile,
  type IGigInterest,
  type IGigJob,
} from './gigJob.model';
import { categoryTitles } from './gigCategory.service';

/**
 * The Gig Jobs console (gig-jobs.duncit.com): every gig, freelancer and
 * interest across the platform, for staff. Members' own reads live in
 * gigJob.service — nothing here is scoped to a viewer, so every entry point is
 * role-gated in the resolver.
 */

const fail = (code: string, message: string) => new GraphQLError(message, { extensions: { code } });
const iso = (value: Date | null | undefined) => value?.toISOString?.() ?? null;

const JOB_TABLE: TableEntityConfig = {
  searchFields: ['title', 'poster_name', 'city', 'roles', 'contact_phone', 'contact_email'],
  sortFields: {
    title: 'title',
    city: 'city',
    status: 'status',
    poster_role: 'poster_role',
    interest_count: 'interest_count',
    event_date: 'event_date',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    poster_role: { type: 'enum' },
    city: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const FREELANCER_TABLE: TableEntityConfig = {
  searchFields: ['display_name', 'city', 'skills', 'contact_phone', 'contact_email'],
  sortFields: { display_name: 'display_name', city: 'city', experience_years: 'experience_years', created_at: 'created_at' },
  filterFields: { city: { type: 'string' }, is_available: { type: 'boolean' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

const INTEREST_TABLE: TableEntityConfig = {
  searchFields: ['freelancer_name', 'freelancer_phone', 'freelancer_email', 'skills', 'message'],
  sortFields: { freelancer_name: 'freelancer_name', created_at: 'created_at' },
  filterFields: { created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

const toJobRow = (job: IGigJob, titles: Map<string, string>) => ({
  id: String(job._id),
  title: job.title,
  category_title: titles.get(String(job.category_id)) ?? '',
  roles: job.roles ?? [],
  event_type: job.event_type,
  event_date: iso(job.event_date),
  city: job.city ?? '',
  budget: job.budget ?? null,
  openings: job.openings ?? 1,
  status: job.status,
  poster_role: job.poster_role,
  poster_name: job.poster_name ?? '',
  poster_user_id: String(job.poster_user_id),
  interest_count: job.interest_count ?? 0,
  contact: { name: job.contact_name ?? '', phone: job.contact_phone ?? '', email: job.contact_email ?? '' },
  created_at: iso(job.created_at) ?? '',
});

const toFreelancerRow = (doc: IFreelancerProfile, titles: Map<string, string>) => ({
  id: String(doc._id),
  user_id: String(doc.user_id),
  display_name: doc.display_name ?? '',
  city: doc.city ?? '',
  skills: doc.skills ?? [],
  category_titles: (doc.category_ids ?? []).map((id) => titles.get(String(id)) ?? '').filter(Boolean),
  experience_years: doc.experience_years ?? 0,
  portfolio_url: doc.portfolio_url ?? '',
  contact: { name: doc.display_name ?? '', phone: doc.contact_phone ?? '', email: doc.contact_email ?? '' },
  is_available: doc.is_available !== false,
  created_at: iso(doc.created_at) ?? '',
});

const toInterestRow = (row: IGigInterest, jobTitles: Map<string, string>) => ({
  id: String(row._id),
  job_id: String(row.job_id),
  job_title: jobTitles.get(String(row.job_id)) ?? '',
  freelancer_name: row.freelancer_name ?? '',
  skills: row.skills ?? [],
  message: row.message ?? '',
  contact: { name: row.freelancer_name ?? '', phone: row.freelancer_phone ?? '', email: row.freelancer_email ?? '' },
  created_at: iso(row.created_at) ?? '',
});

function requireJobId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw fail('NOT_FOUND', 'Gig not found');
  return new Types.ObjectId(id);
}

export const gigAdminService = {
  /** The console dashboard: one read per number, all in parallel. */
  async stats() {
    const [total, open, interests, freelancers, posters, categories] = await Promise.all([
      GigJobModel.estimatedDocumentCount(),
      GigJobModel.countDocuments({ status: 'OPEN' }),
      GigInterestModel.estimatedDocumentCount(),
      FreelancerProfileModel.estimatedDocumentCount(),
      GigJobModel.distinct('poster_user_id').then((ids) => ids.length),
      GigCategoryModel.countDocuments({ is_active: true }),
    ]);
    return { total, open, closed: Math.max(0, total - open), interests, freelancers, posters, categories };
  },

  async jobsTable(input?: TableQueryInput) {
    const { docs, total, page, page_size } = await runTableQuery<IGigJob>(GigJobModel, {}, input, JOB_TABLE);
    const titles = await categoryTitles(docs.map((doc) => doc.category_id));
    return { rows: docs.map((doc) => toJobRow(doc, titles)), total, page, page_size };
  },

  async freelancersTable(input?: TableQueryInput) {
    const { docs, total, page, page_size } = await runTableQuery<IFreelancerProfile>(
      FreelancerProfileModel,
      {},
      input,
      FREELANCER_TABLE
    );
    const titles = await categoryTitles(docs.flatMap((doc) => doc.category_ids ?? []));
    return { rows: docs.map((doc) => toFreelancerRow(doc, titles)), total, page, page_size };
  },

  /** Every interest, or one gig's when `jobId` is given. */
  async interestsTable(input?: TableQueryInput, jobId?: string | null) {
    const base = jobId ? { job_id: requireJobId(jobId) } : {};
    const { docs, total, page, page_size } = await runTableQuery<IGigInterest>(
      GigInterestModel,
      base,
      input,
      INTEREST_TABLE
    );
    const jobs = await GigJobModel.find({ _id: { $in: docs.map((doc) => doc.job_id) } }).select('title').lean();
    const jobTitles = new Map(jobs.map((job) => [String(job._id), job.title]));
    return { rows: docs.map((doc) => toInterestRow(doc, jobTitles)), total, page, page_size };
  },

  async setStatus(actorId: string, id: string, status: GigJobStatus) {
    if (!GIG_JOB_STATUSES.includes(status)) throw fail('BAD_USER_INPUT', 'Unknown status');
    const res = await GigJobModel.updateOne({ _id: requireJobId(id) }, { $set: { status } });
    if (res.matchedCount === 0) throw fail('NOT_FOUND', 'Gig not found');
    logs.server.info('gigAdmin', 'setStatus', { actorId, jobId: id, status });
    return true;
  },

  /** Removes a gig and every interest on it — moderation, not a poster's close. */
  async remove(actorId: string, id: string) {
    const oid = requireJobId(id);
    const job = await GigJobModel.findById(oid).select('title poster_user_id').lean();
    if (!job) throw fail('NOT_FOUND', 'Gig not found');
    const { deletedCount } = await GigInterestModel.deleteMany({ job_id: oid });
    await GigJobModel.deleteOne({ _id: oid });
    logs.server.info('gigAdmin', 'remove', {
      actorId,
      jobId: id,
      posterId: String(job.poster_user_id),
      interestsRemoved: deletedCount,
    });
    return true;
  },
};
