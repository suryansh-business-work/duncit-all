import { Types } from 'mongoose';
import { verificationService } from '../../verification.service';
import { UserModel } from '@modules/access/user/user.model';

/** A user whose login email the app already verified (EMAIL → VERIFIED_BY_APP). */
async function seedVerifiedUser() {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id,
    auth: { email: `${_id.toString()}@duncit.com`, is_email_verified: true },
    profile: { first_name: 'Veri' },
  } as never);
  return String(_id);
}

describe('verificationService.tableForUser (userVerificationsTable) integration', () => {
  it('pages the computed verification rows with search, filters, sort and paging', async () => {
    const userId = await seedVerifiedUser();
    await verificationService.submit(userId, 'IDENTITY', 'https://cdn.duncit.com/id.png');
    await verificationService.submitAddress(userId, {
      line1: '1 MG Road',
      city: 'Delhi',
      state: 'DL',
      pincode: '110001',
    });

    // Plain envelope in the catalog order (IDENTITY, ADDRESS, EMAIL).
    const all = await verificationService.tableForUser(userId);
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r.type)).toEqual(['IDENTITY', 'ADDRESS', 'EMAIL']);
    expect(all.rows.map((r) => r.status)).toEqual(['PENDING', 'PENDING', 'VERIFIED_BY_APP']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans type and status.
    const pendingSearch = await verificationService.tableForUser(userId, { search: 'pending' });
    expect(pendingSearch.rows.map((r) => r.type)).toEqual(['IDENTITY', 'ADDRESS']);
    expect(pendingSearch.total).toBe(2);
    const emailSearch = await verificationService.tableForUser(userId, { search: 'email' });
    expect(emailSearch.rows.map((r) => r.type)).toEqual(['EMAIL']);

    // Enum filters narrow.
    const address = await verificationService.tableForUser(userId, {
      filters: [{ field: 'type', op: 'eq', value: 'ADDRESS' }],
    });
    expect(address.rows.map((r) => r.type)).toEqual(['ADDRESS']);
    const pending = await verificationService.tableForUser(userId, {
      filters: [{ field: 'status', op: 'eq', value: 'PENDING' }],
    });
    expect(pending.total).toBe(2);

    // Allowlisted sort overrides the catalog order.
    const sorted = await verificationService.tableForUser(userId, {
      sort_by: 'type',
      sort_dir: 'asc',
    });
    expect(sorted.rows.map((r) => r.type)).toEqual(['ADDRESS', 'EMAIL', 'IDENTITY']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await verificationService.tableForUser(userId, { page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r.type)).toEqual(['ADDRESS']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);

    // A review is reflected on the next page fetch.
    await verificationService.review('a'.repeat(24), userId, 'IDENTITY', 'APPROVED');
    const approved = await verificationService.tableForUser(userId, {
      filters: [{ field: 'status', op: 'eq', value: 'APPROVED' }],
    });
    expect(approved.rows.map((r) => r.type)).toEqual(['IDENTITY']);
  });
});
