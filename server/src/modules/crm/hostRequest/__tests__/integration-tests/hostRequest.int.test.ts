import { Types } from 'mongoose';
import { hostRequestService } from '../../hostRequest.service';
import { HostRequestModel } from '../../hostRequest.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { sendEmail } from '@services/email/email.service';
import { notificationService } from '@modules/engagement/notification/notification.service';

jest.mock('@services/email/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn().mockResolvedValue(undefined) },
}));

const mockSendEmail = sendEmail as jest.Mock;
const mockNotify = notificationService.create as jest.Mock;

const REVIEWER = { id: 'staff-1', name: 'ops@example.com' };

/** Seed an APPROVED host plus its super/category/sub categories; return ids. */
async function seedApprovedHost(overrides: Partial<{ email: string; phone: string }> = {}) {
  const userId = new Types.ObjectId().toString();
  await HostModel.create({
    user_id: userId,
    full_name: 'Asha Host',
    email: overrides.email ?? 'asha@example.com',
    phone: overrides.phone ?? '+919999999999',
    status: 'APPROVED',
  });
  const sup = await CategoryModel.create({ name: 'For You', slug: `for-you-${userId}`, level: 'SUPER' });
  const cat = await CategoryModel.create({ name: 'Sports', slug: `sports-${userId}`, level: 'CATEGORY', parent_id: sup._id });
  const sub = await CategoryModel.create({ name: 'Badminton', slug: `badminton-${userId}`, level: 'SUB', parent_id: cat._id });
  return {
    userId,
    super_category_id: String(sup._id),
    category_id: String(cat._id),
    sub_category_id: String(sub._id),
  };
}

const submitInput = (seed: { super_category_id: string; category_id: string; sub_category_id: string }) => ({
  super_category_id: seed.super_category_id,
  category_id: seed.category_id,
  sub_category_id: seed.sub_category_id,
  survey_id: new Types.ObjectId().toString(),
  answers: [
    { qid: 'q1', value: 'Yes' },
    { qid: 'q2', values: ['A', 'B'] },
  ],
});

/** Submit on behalf of an already-APPROVED host (gate satisfied by the Host doc). */
const submit = (userId: string, input: Parameters<typeof hostRequestService.submit>[1]) =>
  hostRequestService.submit(userId, input, { isHost: false });

describe('hostRequestService — submit', () => {
  it('FORBIDDEN when the caller is neither a HOST by role nor an APPROVED host', async () => {
    await expect(
      hostRequestService.submit(new Types.ObjectId().toString(), {}, { isHost: false })
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('FORBIDDEN for a non-approved host doc when not a HOST by role', async () => {
    const userId = new Types.ObjectId().toString();
    await HostModel.create({ user_id: userId, status: 'SUBMITTED' });
    await expect(
      hostRequestService.submit(userId, {}, { isHost: false })
    ).rejects.toThrow(/approved hosts/i);
  });

  it('allows a HOST-by-role with no Host doc, sourcing contact from the User', async () => {
    const userId = new Types.ObjectId().toString();
    await UserModel.create({
      _id: userId,
      auth: { email: 'role-host@example.com', phone: { number: '9876543210', extension: '91' } },
      profile: { first_name: 'Role', last_name: 'Host' },
    });
    const out = await hostRequestService.submit(userId, {}, { isHost: true });
    expect(out.status).toBe('REQUESTED');
    expect(out.host_name).toBe('Role Host');
    expect(out.host_email).toBe('role-host@example.com');
    expect(out.host_phone).toBe('+919876543210');
    expect(out.audit_log[0].by_name).toBe('Role Host');
  });

  it('sources contact from a minimal User (no phone, single name) for a HOST by role', async () => {
    const userId = new Types.ObjectId().toString();
    await UserModel.create({
      _id: userId,
      auth: { email: 'minimal@example.com' },
      profile: { first_name: 'Solo' },
    });
    const out = await hostRequestService.submit(userId, {}, { isHost: true });
    expect(out.host_name).toBe('Solo');
    expect(out.host_email).toBe('minimal@example.com');
    expect(out.host_phone).toBe('');
  });

  it('tolerates a HOST by role whose User doc is missing entirely', async () => {
    const out = await hostRequestService.submit(new Types.ObjectId().toString(), {}, { isHost: true });
    expect(out.host_name).toBe('');
    expect(out.host_email).toBe('');
    expect(out.host_phone).toBe('');
  });

  it('allows an APPROVED host doc even when not a HOST by role', async () => {
    const seed = await seedApprovedHost();
    const out = await hostRequestService.submit(seed.userId, submitInput(seed), { isHost: false });
    expect(out.status).toBe('REQUESTED');
    expect(out.host_name).toBe('Asha Host');
  });

  it('creates a request with resolved names, audit, responses, notify + email', async () => {
    const seed = await seedApprovedHost();
    const out = await submit(seed.userId, submitInput(seed));

    expect(out.request_no).toBe('HOSTREQ-000001');
    expect(out.status).toBe('REQUESTED');
    expect(out.super_category_name).toBe('For You');
    expect(out.category_name).toBe('Sports');
    expect(out.sub_category_name).toBe('Badminton');
    expect(out.host_name).toBe('Asha Host');
    expect(out.host_email).toBe('asha@example.com');
    expect(out.host_phone).toBe('+919999999999');
    expect(out.audit_log).toHaveLength(1);
    expect(out.audit_log[0].status).toBe('REQUESTED');

    const doc: any = await HostRequestModel.findById(out.id);
    expect(doc.responses).toHaveLength(2);
    expect(doc.responses[0]).toMatchObject({ qid: 'q1', value: 'Yes', values: [] });
    expect(doc.responses[1]).toMatchObject({ qid: 'q2', value: null, values: ['A', 'B'] });

    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ scope: 'USER', target_user_ids: [seed.userId] }));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'host-request-submitted', to: 'asha@example.com' })
    );
  });

  it('allocates sequential request numbers across applications', async () => {
    const seed = await seedApprovedHost();
    const first = await submit(seed.userId, submitInput(seed));
    // Resolve the first so a same-category re-apply is allowed.
    await hostRequestService.reject(first.id, REVIEWER, 'no');
    const second = await submit(seed.userId, submitInput(seed));
    expect(first.request_no).toBe('HOSTREQ-000001');
    expect(second.request_no).toBe('HOSTREQ-000002');
  });

  it('CONFLICT on a leaf already held by an ACTIVE request', async () => {
    const seed = await seedApprovedHost();
    await hostRequestService.submit(seed.userId, submitInput(seed), { isHost: false });
    await expect(
      hostRequestService.submit(seed.userId, submitInput(seed), { isHost: false })
    ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('CONFLICT on a leaf already APPROVED on the Host doc (not just active)', async () => {
    const seed = await seedApprovedHost();
    const req = await hostRequestService.submit(seed.userId, submitInput(seed), { isHost: false });
    // Approve it so the leaf moves onto Host.host_categories and the request is terminal.
    await hostRequestService.approve(req.id, REVIEWER);
    await expect(
      hostRequestService.submit(seed.userId, submitInput(seed), { isHost: false })
    ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('allows a sibling sub-category under the same super/category', async () => {
    const seed = await seedApprovedHost();
    await hostRequestService.submit(seed.userId, submitInput(seed), { isHost: false });
    const sibling = await CategoryModel.create({
      name: 'Tennis',
      slug: `tennis-${seed.userId}`,
      level: 'SUB',
      parent_id: new Types.ObjectId(seed.category_id),
    });
    const out = await hostRequestService.submit(
      seed.userId,
      { ...submitInput(seed), sub_category_id: String(sibling._id) },
      { isHost: false }
    );
    expect(out.status).toBe('REQUESTED');
  });

  it('handles no-answers and empty-category submit (no category resolution)', async () => {
    const userId = new Types.ObjectId().toString();
    await HostModel.create({ user_id: userId, full_name: 'Bare', email: 'bare@example.com', status: 'APPROVED' });
    const out = await submit(userId, {});
    expect(out.super_category_name).toBe('');
    expect(out.category_name).toBe('');
    expect(out.sub_category_name).toBe('');
  });

  it('skips email when the host has no email, but still notifies', async () => {
    const userId = new Types.ObjectId().toString();
    await HostModel.create({ user_id: userId, full_name: 'NoMail', email: '', status: 'APPROVED' });
    await submit(userId, {});
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalled();
  });

  it('survives an email send failure (best-effort)', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('smtp down'));
    const seed = await seedApprovedHost();
    const out = await submit(seed.userId, submitInput(seed));
    expect(out.status).toBe('REQUESTED');
  });

  it('survives a notification failure (best-effort)', async () => {
    mockNotify.mockRejectedValueOnce(new Error('sse down'));
    const seed = await seedApprovedHost();
    const out = await submit(seed.userId, submitInput(seed));
    expect(out.status).toBe('REQUESTED');
  });
});

describe('hostRequestService — acknowledge', () => {
  it('moves REQUESTED -> ACKNOWLEDGED with audit, notify + email', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    const ack = await hostRequestService.acknowledge(req.id, REVIEWER);
    expect(ack.status).toBe('ACKNOWLEDGED');
    expect(ack.audit_log).toHaveLength(2);
    expect(ack.audit_log[1].by_name).toBe('ops@example.com');
    expect(mockSendEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({ template: 'host-request-acknowledged' })
    );
  });

  it('guards against acknowledging a non-requested request', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    await hostRequestService.acknowledge(req.id, REVIEWER);
    await expect(hostRequestService.acknowledge(req.id, REVIEWER)).rejects.toThrow(/requested host request/i);
  });

  it('404s an unknown id', async () => {
    await expect(
      hostRequestService.acknowledge(new Types.ObjectId().toString(), REVIEWER)
    ).rejects.toThrow(/not found/i);
  });
});

describe('hostRequestService — approve', () => {
  it('approves a REQUESTED request, syncs the host category, notify + email', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    const approved = await hostRequestService.approve(req.id, REVIEWER, 'Welcome aboard');
    expect(approved.status).toBe('APPROVED');
    expect(approved.reviewer_notes).toBe('Welcome aboard');

    const host: any = await HostModel.findOne({ user_id: new Types.ObjectId(seed.userId) });
    expect(host.host_categories).toHaveLength(1);
    expect(host.host_categories[0]).toMatchObject({
      super_category_name: 'For You',
      category_name: 'Sports',
      sub_category_name: 'Badminton',
      request_no: 'HOSTREQ-000001',
    });
    expect(String(host.host_categories[0].super_category_id)).toBe(seed.super_category_id);
    expect(String(host.host_categories[0].category_id)).toBe(seed.category_id);
    expect(String(host.host_categories[0].sub_category_id)).toBe(seed.sub_category_id);
    expect(mockSendEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({ template: 'host-request-approved' })
    );
  });

  it('approves an ACKNOWLEDGED request without notes', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    await hostRequestService.acknowledge(req.id, REVIEWER);
    const approved = await hostRequestService.approve(req.id, REVIEWER);
    expect(approved.status).toBe('APPROVED');
    expect(approved.reviewer_notes).toBe('');
    expect(approved.audit_log.at(-1)?.note).toBe('Request approved');
  });

  it('guards against approving a terminal request', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    await hostRequestService.approve(req.id, REVIEWER);
    await expect(hostRequestService.approve(req.id, REVIEWER)).rejects.toThrow(/already been decided/i);
  });

  it('404s an unknown id', async () => {
    await expect(
      hostRequestService.approve(new Types.ObjectId().toString(), REVIEWER)
    ).rejects.toThrow(/not found/i);
  });
});

describe('hostRequestService — reject', () => {
  it('rejects a REQUESTED request with notes, notify + email', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    const rejected = await hostRequestService.reject(req.id, REVIEWER, 'Not a fit right now');
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.reviewer_notes).toBe('Not a fit right now');
    expect(mockSendEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({ template: 'host-request-rejected' })
    );
  });

  it('rejects an ACKNOWLEDGED request', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    await hostRequestService.acknowledge(req.id, REVIEWER);
    const rejected = await hostRequestService.reject(req.id, REVIEWER, 'changed mind');
    expect(rejected.status).toBe('REJECTED');
  });

  it('guards against rejecting a terminal request', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    await hostRequestService.reject(req.id, REVIEWER, 'no');
    await expect(hostRequestService.reject(req.id, REVIEWER, 'again')).rejects.toThrow(/already been decided/i);
  });

  it('404s an unknown id', async () => {
    await expect(
      hostRequestService.reject(new Types.ObjectId().toString(), REVIEWER, 'x')
    ).rejects.toThrow(/not found/i);
  });
});

describe('hostRequestService — queries', () => {
  it('myActive returns the latest active request, null when none/terminal', async () => {
    const seed = await seedApprovedHost();
    expect(await hostRequestService.myActive(seed.userId)).toBeNull();

    const req = await submit(seed.userId, submitInput(seed));
    const active = await hostRequestService.myActive(seed.userId);
    expect(active?.id).toBe(req.id);

    await hostRequestService.reject(req.id, REVIEWER, 'no');
    expect(await hostRequestService.myActive(seed.userId)).toBeNull();
  });

  it('listMine returns the host history newest first', async () => {
    const seed = await seedApprovedHost();
    const first = await submit(seed.userId, submitInput(seed));
    await hostRequestService.reject(first.id, REVIEWER, 'no');
    const second = await submit(seed.userId, submitInput(seed));
    const mine = await hostRequestService.listMine(seed.userId);
    expect(mine).toHaveLength(2);
    expect(mine[0].id).toBe(second.id);
  });

  it('list filters by status and returns all when unfiltered', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    await hostRequestService.acknowledge(req.id, REVIEWER);

    const all = await hostRequestService.list();
    expect(all).toHaveLength(1);
    const acknowledged = await hostRequestService.list({ status: 'ACKNOWLEDGED' });
    expect(acknowledged).toHaveLength(1);
    const requested = await hostRequestService.list({ status: 'REQUESTED' });
    expect(requested).toHaveLength(0);
  });

  it('getById returns the request or null', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    expect((await hostRequestService.getById(req.id))?.id).toBe(req.id);
    expect(await hostRequestService.getById(new Types.ObjectId().toString())).toBeNull();
  });
});

describe('hostRequestService — takenCategoryIds', () => {
  it('returns [] when the host holds no categories and has no active requests', async () => {
    const seed = await seedApprovedHost();
    expect(await hostRequestService.takenCategoryIds(seed.userId)).toEqual([]);
  });

  it('includes leaves held on Host.host_categories (leaf = sub ?? category ?? super)', async () => {
    const seed = await seedApprovedHost();
    await HostModel.updateOne(
      { user_id: new Types.ObjectId(seed.userId) },
      {
        $set: {
          host_categories: [
            {
              super_category_id: new Types.ObjectId(seed.super_category_id),
              category_id: new Types.ObjectId(seed.category_id),
              sub_category_id: new Types.ObjectId(seed.sub_category_id),
              super_category_name: 'For You',
              category_name: 'Sports',
              sub_category_name: 'Badminton',
              request_no: 'HOSTREQ-000009',
            },
            // Category-level leaf (no sub) -> leaf is the category id.
            {
              super_category_id: new Types.ObjectId(seed.super_category_id),
              category_id: new Types.ObjectId(seed.category_id),
              sub_category_id: null,
              super_category_name: 'For You',
              category_name: 'Sports',
              sub_category_name: '',
              request_no: 'HOSTREQ-000010',
            },
          ],
        },
      }
    );
    const taken = await hostRequestService.takenCategoryIds(seed.userId);
    expect(taken).toContain(seed.sub_category_id);
    expect(taken).toContain(seed.category_id);
    expect(taken).not.toContain(seed.super_category_id);
  });

  it('falls back to the category/super id when a held entry has no deeper leaf', async () => {
    const seed = await seedApprovedHost();
    await HostModel.updateOne(
      { user_id: new Types.ObjectId(seed.userId) },
      {
        $set: {
          host_categories: [
            // Super-only entry -> leaf is the super id (category + sub null).
            {
              super_category_id: new Types.ObjectId(seed.super_category_id),
              category_id: null,
              sub_category_id: null,
              super_category_name: 'For You',
              category_name: '',
              sub_category_name: '',
              request_no: 'HOSTREQ-000011',
            },
          ],
        },
      }
    );
    expect(await hostRequestService.takenCategoryIds(seed.userId)).toEqual([seed.super_category_id]);
  });

  it('includes leaves from ACTIVE requests when the caller has no Host doc', async () => {
    const userId = new Types.ObjectId().toString();
    await UserModel.create({
      _id: userId,
      auth: { email: 'no-host@example.com' },
      profile: { first_name: 'No', last_name: 'Host' },
    });
    const sub = await CategoryModel.create({
      name: 'Chess',
      slug: `chess-${userId}`,
      level: 'SUB',
    });
    await hostRequestService.submit(
      userId,
      {
        super_category_id: null,
        category_id: null,
        sub_category_id: String(sub._id),
        survey_id: new Types.ObjectId().toString(),
        answers: [],
      },
      { isHost: true }
    );
    const taken = await hostRequestService.takenCategoryIds(userId);
    expect(taken).toEqual([String(sub._id)]);
  });

  it('includes leaves from ACTIVE requests only', async () => {
    const seed = await seedApprovedHost();
    await submit(seed.userId, submitInput(seed));
    const taken = await hostRequestService.takenCategoryIds(seed.userId);
    expect(taken).toEqual([seed.sub_category_id]);
  });

  it('unions held categories and active requests, de-duplicated', async () => {
    const seed = await seedApprovedHost();
    const req = await submit(seed.userId, submitInput(seed));
    await hostRequestService.approve(req.id, REVIEWER); // moves leaf onto host_categories
    // A second active request on a sibling sub adds a distinct leaf.
    const sibling = await CategoryModel.create({
      name: 'Tennis',
      slug: `tennis-taken-${seed.userId}`,
      level: 'SUB',
      parent_id: new Types.ObjectId(seed.category_id),
    });
    await submit(seed.userId, { ...submitInput(seed), sub_category_id: String(sibling._id) });
    const taken = await hostRequestService.takenCategoryIds(seed.userId);
    expect(taken.sort()).toEqual([seed.sub_category_id, String(sibling._id)].sort());
  });
});
