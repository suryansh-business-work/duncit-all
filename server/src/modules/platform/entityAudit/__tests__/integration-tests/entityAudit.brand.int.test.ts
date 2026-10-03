import { Types } from 'mongoose';
import { entityAuditResolvers } from '../../entityAudit.resolver';
import { entityAuditService } from '../../entityAudit.service';
import { ENTITY_AUDIT_CONFIG } from '../../entityAudit.fields';
import { ENTITY_AUDIT_TYPES } from '../../entityAudit.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { makeContext } from '@test/harness';

/**
 * A partner brand's change log: read by the staff who review brands and by the
 * partner who owns THAT brand — nobody else — and it never records a secret.
 */

const Q = entityAuditResolvers.Query;

const ownerId = new Types.ObjectId();
const brandId = new Types.ObjectId();

const before = {
  _id: brandId,
  owner_user_id: ownerId,
  brand_name: 'Audit Co',
  status: 'SUBMITTED',
  integrations: { razorpay: { connected: false, key_id: '', key_secret: '' } },
};
const after = {
  ...before,
  status: 'APPROVED',
  integrations: { razorpay: { connected: true, key_id: 'rzp_live_audit', key_secret: 'audit-key-secret' } },
};

/** The brand on file plus one recorded change (written past the model, so only this entry exists). */
async function seedBrandWithHistory() {
  await EcommBrandModel.collection.insertOne(after as never);
  await entityAuditService.record({
    entityType: 'BRAND',
    entityId: String(brandId),
    before,
    after,
    action: 'UPDATE',
  });
}

const readLog = (ctx: ReturnType<typeof makeContext>, entityId = String(brandId)) =>
  Q.entityChangeLogsTable({}, { entity_type: 'BRAND', entity_id: entityId }, ctx);

describe('BRAND change log — what it records', () => {
  it('is a known audit type and tracks no credential', () => {
    expect(ENTITY_AUDIT_TYPES).toContain('BRAND');
    const paths = ENTITY_AUDIT_CONFIG.BRAND.fields.map((f) => f.path);
    expect(paths).toEqual(expect.arrayContaining(['status', 'is_active', 'live', 'integrations.razorpay.connected']));
    for (const path of paths) {
      expect(path).not.toMatch(/password|key_secret|webhook_secret|key_id|\.email$/);
    }
    expect(ENTITY_AUDIT_CONFIG.BRAND).toMatchObject({ labelPath: 'brand_name', ownerPath: 'owner_user_id' });
  });

  it('records the status and connection moving, labelled with the brand — never the secret behind it', async () => {
    await seedBrandWithHistory();
    const page = await readLog(makeContext({ roles: ['SUPER_ADMIN'] }));

    expect(page.rows.map((r) => r.field).sort()).toEqual(['integrations.razorpay.connected', 'status']);
    expect(page.rows.every((r) => r.entity_type === 'BRAND' && r.entity_label === 'Audit Co')).toBe(true);
    // Written outside a request: the server did it.
    expect(page.rows.every((r) => r.actor_type === 'SYSTEM')).toBe(true);
    const payload = JSON.stringify(page.rows);
    expect(payload).not.toContain('audit-key-secret');
    expect(payload).not.toContain('rzp_live_audit');
  });
});

describe('BRAND change log — who may read it', () => {
  it('lets the brand’s own partner read its history', async () => {
    await seedBrandWithHistory();
    const page = await readLog(makeContext({ id: String(ownerId), roles: ['USER', 'ECOMM_MANAGER'] }));
    expect(page.total).toBe(2);
  });

  it.each(['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER', 'PRODUCTS_MANAGER'])(
    'lets brand-review staff (%s) read any brand’s history',
    async (role) => {
      await seedBrandWithHistory();
      const page = await readLog(makeContext({ roles: [role] }));
      expect(page.total).toBe(2);
    }
  );

  it('refuses another partner, even an e-commerce manager', async () => {
    await seedBrandWithHistory();
    await expect(readLog(makeContext({ roles: ['USER', 'ECOMM_MANAGER'] }))).rejects.toMatchObject({
      message: 'That is not your brand',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('refuses a non-staff caller for an unknown or malformed brand id instead of reading nothing', async () => {
    const partner = makeContext({ id: String(ownerId), roles: ['USER'] });
    await expect(readLog(partner, new Types.ObjectId().toHexString())).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(readLog(partner, 'not-an-id')).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('refuses the anonymous', async () => {
    await seedBrandWithHistory();
    await expect(readLog(makeContext(null))).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
  });

  it('keeps the console-wide brand feed to staff — an owner has no "all brands" to read', async () => {
    await seedBrandWithHistory();
    const feed = await Q.entityChangeFeedTable({}, { entity_type: 'BRAND' }, makeContext({ roles: ['PRODUCTS_MANAGER'] }));
    expect(feed.total).toBe(2);

    await expect(
      Q.entityChangeFeedTable({}, { entity_type: 'BRAND' }, makeContext({ id: String(ownerId), roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('leaves the other entities staff-only: the owner rule is the brand’s alone', async () => {
    await expect(
      Q.entityChangeLogsTable(
        {},
        { entity_type: 'VENUE', entity_id: String(brandId) },
        makeContext({ id: String(ownerId), roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
  });
});
