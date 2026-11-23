import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { HostLeadModel } from '@modules/crm/crm/crm.model';
import { crmService } from '@modules/crm/crm/crm.service';
import { prospectLeadService } from '@modules/crm/prospectLead/prospectLead.service';
import { applyAssignee, cleanUserIds, listAssignableUsers, usersByIds } from '../../crmUser.service';

/**
 * The CRM team as the CRM sees it: who can be assigned a lead, what the CRM
 * may read about a user id, and how a lead's assignee stays consistent for
 * the current portal (a user id) and older ones (a free-text name).
 */

async function user(first: string, roles: string[], metadata: Record<string, unknown> = {}) {
  const doc = await UserModel.create({
    auth: { email: `${first.toLowerCase()}@duncit.test` },
    profile: { first_name: first, last_name: 'Test' },
    metadata: { role_keys: roles, ...metadata },
  });
  return String(doc._id);
}

describe('listAssignableUsers', () => {
  it('lists only active CRM staff, A–Z, searchable by name or email, within the limit', async () => {
    await user('Zara', ['CRM_MANAGER']);
    await user('Amit', ['SUPER_ADMIN', 'USER']);
    await user('Member', ['USER']);
    await user('Gone', ['CRM_MANAGER'], { deleted_at: new Date() });
    await user('Paused', ['CRM_MANAGER'], { status: 'SUSPENDED' });

    const all = await listAssignableUsers();
    expect(all.map((u) => u.name)).toEqual(['Amit Test', 'Zara Test']);
    expect(all[0]).toMatchObject({ email: 'amit@duncit.test', roles: ['SUPER_ADMIN'], is_staff: true });

    expect((await listAssignableUsers('zara@')).map((u) => u.name)).toEqual(['Zara Test']);
    expect((await listAssignableUsers('  test ', 1)).map((u) => u.name)).toEqual(['Amit Test']);
    // A regex-looking search is matched literally.
    expect(await listAssignableUsers('.*')).toEqual([]);
  });
});

describe('usersByIds', () => {
  it('names every id it finds but withholds email and roles from anyone not on the CRM team', async () => {
    const staffId = await user('Priya', ['CRM_MANAGER']);
    const memberId = await user('Member', ['USER']);

    const found = await usersByIds([staffId, memberId, 'not-an-id', new Types.ObjectId().toHexString()]);

    const byId = new Map(found.map((u) => [u.id, u]));
    expect(byId.get(staffId)).toMatchObject({ name: 'Priya Test', email: 'priya@duncit.test', is_staff: true });
    expect(byId.get(memberId)).toMatchObject({ name: 'Member Test', email: null, roles: [], is_staff: false });
    expect(found).toHaveLength(2);
    expect(await usersByIds([])).toEqual([]);
    expect(await usersByIds(null)).toEqual([]);
  });
});

describe('cleanUserIds', () => {
  it('keeps unique well-formed ids, lower-cased, up to the cap', () => {
    const a = '64B7F0C2A1B2C3D4E5F60718';
    const b = '64b7f0c2a1b2c3d4e5f60719';
    expect(cleanUserIds([a, a.toLowerCase(), b, 'x', null, '123456789012'])).toEqual([a.toLowerCase(), b]);
    expect(cleanUserIds([a, b], 1)).toEqual([a.toLowerCase()]);
    expect(cleanUserIds(undefined)).toEqual([]);
  });
});

describe('applyAssignee', () => {
  it("copies a picked team member's name, clears on null, and refuses anyone not on the team", async () => {
    const priya = await user('Priya', ['CRM_MANAGER']);
    const member = await user('Member', ['USER']);

    await expect(applyAssignee({ assigned_user_id: priya, assigned_to: 'typed' })).resolves.toMatchObject({
      assigned_user_id: priya,
      assigned_to: 'Priya Test',
    });
    await expect(applyAssignee({ assigned_user_id: null, assigned_to: 'Legacy Name' })).resolves.toEqual({
      assigned_user_id: null,
      assigned_to: 'Legacy Name',
    });
    const refusal = 'Assign the lead to an active CRM team member.';
    await expect(applyAssignee({ assigned_user_id: member })).rejects.toThrow(refusal);
    await expect(applyAssignee({ assigned_user_id: 'garbage' })).rejects.toThrow(refusal);
  });

  it('drops the linked user when an older portal changes the name, and keeps it when the name is untouched', async () => {
    const priya = await user('Priya', ['CRM_MANAGER']);
    const lead = await crmService.createHostLead({ host_name: 'Asha', assigned_user_id: priya });
    expect(lead).toMatchObject({ assigned_user_id: priya, assigned_to: 'Priya Test' });

    const untouched = await crmService.updateHostLead(lead!.id, { host_name: 'Asha', assigned_to: 'Priya Test' });
    expect(untouched).toMatchObject({ assigned_user_id: priya });

    const renamed = await crmService.updateHostLead(lead!.id, { host_name: 'Asha', assigned_to: 'Ravi' });
    expect(renamed).toMatchObject({ assigned_user_id: null, assigned_to: 'Ravi' });
    // Nothing to compare against: no stored lead, or a malformed id.
    await expect(applyAssignee({ assigned_to: 'x' }, { entity_type: 'HOST_LEAD', id: 'bad' })).resolves.toEqual({ assigned_to: 'x' });
    await expect(
      applyAssignee({ assigned_to: 'x' }, { entity_type: 'HOST_LEAD', id: new Types.ObjectId().toHexString() })
    ).resolves.toEqual({ assigned_to: 'x' });
  });
});

describe('Assigned To in the Leads listing', () => {
  it('filters by the assigned user and sorts by their name, for every lead kind', async () => {
    const priya = await user('Priya', ['CRM_MANAGER']);
    const amit = await user('Amit', ['CRM_MANAGER']);
    await crmService.createHostLead({ host_name: 'One', assigned_user_id: priya });
    await crmService.createHostLead({ host_name: 'Two', assigned_user_id: amit });
    await HostLeadModel.create({ host_name: 'Three', assigned_to: 'Hand typed' });

    const filtered = await crmService.hostLeadsTable({ filters: [{ field: 'assigned_to', op: 'in', values: [priya] }] });
    expect(filtered.rows.map((row) => row.host_name)).toEqual(['One']);

    const sorted = await crmService.hostLeadsTable({ sort_by: 'assigned_to', sort_dir: 'asc' });
    expect(sorted.rows.map((row) => row.assigned_to)).toEqual(['Amit Test', 'Hand typed', 'Priya Test']);

    await prospectLeadService.create('CREATOR_LEAD', { creator_name: 'Kai', assigned_user_id: amit });
    const creators = await prospectLeadService.table('CREATOR_LEAD', { filters: [{ field: 'assigned_to', op: 'eq', value: amit }] });
    expect(creators.rows.map((row) => row.creator_name)).toEqual(['Kai']);
  });
});
