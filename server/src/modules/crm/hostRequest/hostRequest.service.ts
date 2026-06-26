import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  HostRequestModel,
  HOST_REQUEST_ACTIVE_STATUSES,
  nextHostRequestNo,
  type HostRequestStatus,
  type IHostRequest,
} from './hostRequest.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { sendEmail } from '@services/email/email.service';

// Schema defaults guarantee Date timestamps, so a direct toISOString is safe.
const iso = (v: Date) => v.toISOString();

interface Reviewer {
  id: string;
  name: string;
}

interface SubmitInput {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  survey_id?: string | null;
  answers?: { qid: string; value?: string | null; values?: string[] | null }[] | null;
}

// Schema string fields default to '' and never persist null/undefined, so the
// string getters below read directly without defensive fallbacks.
const toPub = (h: IHostRequest) => ({
  id: String(h._id),
  request_no: h.request_no,
  host_user_id: String(h.host_user_id),
  host_name: h.contact_name,
  host_email: h.contact_email,
  host_phone: h.contact_phone,
  super_category_id: h.super_category_id ? String(h.super_category_id) : null,
  category_id: h.category_id ? String(h.category_id) : null,
  sub_category_id: h.sub_category_id ? String(h.sub_category_id) : null,
  super_category_name: h.super_category_name,
  category_name: h.category_name,
  sub_category_name: h.sub_category_name,
  survey_id: h.survey_id ? String(h.survey_id) : null,
  status: h.status,
  reviewer_notes: h.reviewer_notes,
  audit_log: h.audit_log.map((a) => ({
    status: a.status,
    by_id: a.by_id,
    by_name: a.by_name,
    at: iso(a.at),
    note: a.note,
  })),
  created_at: iso(h.created_at),
  updated_at: iso(h.updated_at),
});

const oid = (v?: string | null) => (v ? new Types.ObjectId(v) : null);
const notFound = () => new GraphQLError('Host request not found', { extensions: { code: 'NOT_FOUND' } });

/** The leaf (most specific) category id of a {super,category,sub} tuple. */
const leafId = (
  superId?: string | null,
  categoryId?: string | null,
  subId?: string | null
): string | null => subId || categoryId || superId || null;

interface HostContact {
  name: string;
  email: string;
  phone: string;
}

/** Contact snapshot from the User doc — used when the caller is a HOST by role
 * but has no Host application document yet. */
async function contactFromUser(hostUserId: string): Promise<HostContact> {
  const u: any = await UserModel.findById(hostUserId).select(
    'profile.first_name profile.last_name auth.email auth.phone.number auth.phone.extension'
  );
  const number = u?.auth?.phone?.number ?? '';
  const ext = u?.auth?.phone?.extension
    ? `+${String(u.auth.phone.extension).replace(/^\+/, '')}`
    : '';
  return {
    name: `${u?.profile?.first_name ?? ''} ${u?.profile?.last_name ?? ''}`.trim(),
    email: u?.auth?.email ?? '',
    phone: number ? `${ext}${number}` : '',
  };
}

/** Resolve {super,category,sub} ObjectIds to their display names in one query.
 * Missing/unknown ids resolve to '' (the schema default). */
async function resolveCategoryNames(input: SubmitInput) {
  const slots = [input.super_category_id, input.category_id, input.sub_category_id].map((x) =>
    x ? String(x) : ''
  );
  const ids = slots.filter(Boolean);
  const cats = ids.length ? await CategoryModel.find({ _id: { $in: ids } }).select('name').lean() : [];
  const byId = new Map(cats.map((c: any) => [String(c._id), c.name as string]));
  const nameFor = (id: string) => byId.get(id) ?? '';
  return {
    super_category_name: nameFor(slots[0]),
    category_name: nameFor(slots[1]),
    sub_category_name: nameFor(slots[2]),
  };
}

const catPath = (h: IHostRequest) =>
  [h.super_category_name, h.category_name, h.sub_category_name].filter(Boolean).join(' › ');

/** Best-effort in-app (Notification Center) message to the host. */
async function notifyHost(hostUserId: string, title: string, body: string) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({
      title,
      body,
      scope: 'USER',
      target_user_ids: [hostUserId],
      silent: false,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hostRequest] in-app notification failed:', err);
  }
}

/** Best-effort transactional email to the host for a lifecycle event. */
async function emailHost(h: IHostRequest, slug: string, subject: string) {
  if (!h.contact_email) return;
  try {
    await sendEmail({
      to: h.contact_email,
      subject,
      template: slug,
      vars: {
        host_name: h.contact_name,
        request_no: h.request_no,
        category_path: catPath(h),
        reviewer_notes: h.reviewer_notes,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[hostRequest] email failed for ${slug}:`, (err as Error).message);
  }
}

async function loadById(id: string) {
  const h = await HostRequestModel.findById(id);
  if (!h) throw notFound();
  return h;
}

function appendAudit(h: IHostRequest, status: HostRequestStatus, reviewer: Reviewer, note: string) {
  h.audit_log.push({
    status,
    by_id: reviewer.id,
    by_name: reviewer.name,
    at: new Date(),
    note,
  });
}

export const hostRequestService = {
  /** Distinct LEAF category ids (sub ?? category ?? super) the host already holds
   * on their Host doc OR has in an ACTIVE (REQUESTED|ACKNOWLEDGED) request. */
  async takenCategoryIds(hostUserId: string): Promise<string[]> {
    const uid = new Types.ObjectId(hostUserId);
    const [host, active] = await Promise.all([
      HostModel.findOne({ user_id: uid }).select('host_categories'),
      HostRequestModel.find({
        host_user_id: uid,
        status: { $in: HOST_REQUEST_ACTIVE_STATUSES },
      }).select('super_category_id category_id sub_category_id'),
    ]);

    const taken = new Set<string>();
    const add = (
      superId?: Types.ObjectId | null,
      categoryId?: Types.ObjectId | null,
      subId?: Types.ObjectId | null
    ) => {
      const leaf = leafId(
        superId ? String(superId) : null,
        categoryId ? String(categoryId) : null,
        subId ? String(subId) : null
      );
      if (leaf) taken.add(leaf);
    };
    for (const c of host?.host_categories ?? []) {
      add(c.super_category_id, c.category_id, c.sub_category_id);
    }
    for (const r of active) {
      add(r.super_category_id, r.category_id, r.sub_category_id);
    }
    return Array.from(taken);
  },

  async submit(hostUserId: string, input: SubmitInput, opts: { isHost: boolean }) {
    const host = await HostModel.findOne({ user_id: new Types.ObjectId(hostUserId) });
    const allowed = opts.isHost || host?.status === 'APPROVED';
    if (!allowed) {
      throw new GraphQLError('Only approved hosts can apply for a new category', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const inputLeaf = leafId(input.super_category_id, input.category_id, input.sub_category_id);
    if (inputLeaf) {
      const taken = await this.takenCategoryIds(hostUserId);
      if (taken.includes(inputLeaf)) {
        throw new GraphQLError('You already host (or have a pending request for) this category.', {
          extensions: { code: 'CONFLICT' },
        });
      }
    }

    const contact: HostContact = host
      ? { name: host.full_name, email: host.email, phone: host.phone }
      : await contactFromUser(hostUserId);
    const names = await resolveCategoryNames(input);
    const requestNo = await nextHostRequestNo();
    const doc = new HostRequestModel({
      request_no: requestNo,
      host_user_id: new Types.ObjectId(hostUserId),
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.phone,
      super_category_id: oid(input.super_category_id),
      category_id: oid(input.category_id),
      sub_category_id: oid(input.sub_category_id),
      ...names,
      survey_id: oid(input.survey_id),
      responses: (input.answers ?? []).map((a) => ({
        qid: a.qid,
        value: a.value ?? null,
        values: a.values ?? [],
      })),
      status: 'REQUESTED',
    });
    const reviewer: Reviewer = { id: hostUserId, name: contact.name };
    appendAudit(doc, 'REQUESTED', reviewer, 'Request submitted');
    await doc.save();

    await notifyHost(
      hostUserId,
      'Request submitted ✅',
      `Your request to host in ${catPath(doc)} has been submitted. Our onboarding team will review it shortly.`
    );
    await emailHost(doc, 'host-request-submitted', 'Your Duncit host request has been submitted');
    return toPub(doc);
  },

  async acknowledge(id: string, reviewer: Reviewer) {
    const h = await loadById(id);
    if (h.status !== 'REQUESTED') {
      throw new GraphQLError('Only a requested host request can be acknowledged', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    h.status = 'ACKNOWLEDGED';
    appendAudit(h, 'ACKNOWLEDGED', reviewer, 'Request acknowledged');
    await h.save();

    await notifyHost(
      String(h.host_user_id),
      'Request received 👋',
      `We've received your request to host in ${catPath(h)} and our team is reviewing it.`
    );
    await emailHost(h, 'host-request-acknowledged', 'We received your Duncit host request');
    return toPub(h);
  },

  async approve(id: string, reviewer: Reviewer, notes?: string | null) {
    const h = await loadById(id);
    if (h.status !== 'REQUESTED' && h.status !== 'ACKNOWLEDGED') {
      throw new GraphQLError('This host request has already been decided', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    h.status = 'APPROVED';
    if (notes) h.reviewer_notes = notes;
    appendAudit(h, 'APPROVED', reviewer, notes ?? 'Request approved');
    await h.save();

    const { hostService } = await import('@modules/venues/host/host.service');
    await hostService.addCategoryFromRequest(String(h.host_user_id), {
      super_category_id: h.super_category_id,
      category_id: h.category_id,
      sub_category_id: h.sub_category_id,
      super_category_name: h.super_category_name,
      category_name: h.category_name,
      sub_category_name: h.sub_category_name,
      request_no: h.request_no,
    });

    await notifyHost(
      String(h.host_user_id),
      'Congratulations! 🎉',
      `Your request to host in ${catPath(h)} has been approved. You can now start hosting experiences in this category.`
    );
    await emailHost(h, 'host-request-approved', 'Your Duncit host request is approved 🎉');
    return toPub(h);
  },

  async reject(id: string, reviewer: Reviewer, notes: string) {
    const h = await loadById(id);
    if (h.status === 'APPROVED' || h.status === 'REJECTED') {
      throw new GraphQLError('This host request has already been decided', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    h.status = 'REJECTED';
    h.reviewer_notes = notes;
    appendAudit(h, 'REJECTED', reviewer, notes);
    await h.save();

    await notifyHost(
      String(h.host_user_id),
      'Request update',
      `We're unable to approve your request to host in ${catPath(h)} at this time.`
    );
    await emailHost(h, 'host-request-rejected', 'Update on your Duncit host request');
    return toPub(h);
  },

  /** Latest ACTIVE (REQUESTED|ACKNOWLEDGED) request for the host, or null. Drives the banner lock. */
  async myActive(hostUserId: string) {
    const h = await HostRequestModel.findOne({
      host_user_id: new Types.ObjectId(hostUserId),
      status: { $in: HOST_REQUEST_ACTIVE_STATUSES },
    }).sort({ created_at: -1 });
    return h ? toPub(h) : null;
  },

  /** The host's full request history, newest first. */
  async listMine(hostUserId: string) {
    const docs = await HostRequestModel.find({ host_user_id: new Types.ObjectId(hostUserId) }).sort({
      created_at: -1,
    });
    return docs.map(toPub);
  },

  /** Portal listing, optionally filtered by status. */
  async list(filter: { status?: string | null } = {}) {
    const q: any = {};
    if (filter.status) q.status = filter.status;
    const docs = await HostRequestModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    const h = await HostRequestModel.findById(id);
    return h ? toPub(h) : null;
  },
};
