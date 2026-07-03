import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { JobApplicationModel, type IJobApplication, type JobApplicationStatus } from './jobApplication.model';

const toPub = (a: IJobApplication) => ({
  id: String(a._id),
  role_content_id: a.role_content_id ? String(a.role_content_id) : null,
  role_title: a.role_title,
  name: a.name,
  email: a.email,
  phone: a.phone ?? '',
  resume_url: a.resume_url ?? '',
  portfolio_url: a.portfolio_url ?? '',
  cover_note: a.cover_note ?? '',
  status: a.status,
  created_at: a.created_at?.toISOString?.() ?? '',
  updated_at: a.updated_at?.toISOString?.() ?? '',
});

export const jobApplicationService = {
  /** Public submit from the careers page. Soft-dedupes rapid re-submits of the
   * same email+role so a double-click doesn't create twins. */
  async submit(input: any) {
    const roleId =
      input.role_content_id && Types.ObjectId.isValid(input.role_content_id)
        ? new Types.ObjectId(input.role_content_id)
        : null;
    const recent = await JobApplicationModel.findOne({
      email: input.email,
      role_title: input.role_title,
      created_at: { $gte: new Date(Date.now() - 60_000) },
    });
    if (recent) {
      return { ok: true, message: 'Application received — we already have your submission.' };
    }
    await JobApplicationModel.create({
      role_content_id: roleId,
      role_title: input.role_title,
      name: input.name,
      email: input.email,
      phone: input.phone ?? '',
      resume_url: input.resume_url ?? '',
      portfolio_url: input.portfolio_url ?? '',
      cover_note: input.cover_note ?? '',
    });
    return { ok: true, message: "Application received — the team will reach out if it's a match." };
  },

  async list(status?: JobApplicationStatus | null) {
    const q: any = {};
    if (status) q.status = status;
    const docs = await JobApplicationModel.find(q).sort({ created_at: -1 }).limit(500);
    return docs.map(toPub);
  },

  async updateStatus(id: string, status: JobApplicationStatus) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid application id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await JobApplicationModel.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!doc) throw new GraphQLError('Application not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },

  async remove(id: string) {
    const r = await JobApplicationModel.deleteOne({ _id: new Types.ObjectId(id) });
    return r.deletedCount > 0;
  },
};
