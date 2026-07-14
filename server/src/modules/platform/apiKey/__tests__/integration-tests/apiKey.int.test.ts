import { Types } from 'mongoose';
import { apiKeyService } from '../../apiKey.service';
import { ApiKeyModel } from '../../apiKey.model';

const ownerId = new Types.ObjectId().toString();

describe('apiKeyService integration', () => {
  it('creates a key, returns the raw key once and verifies it back', async () => {
    const { raw_key, pub } = await apiKeyService.create(ownerId, 'CI key');
    expect(raw_key).toMatch(/^dk_live_[0-9a-f]{48}$/);
    expect(pub.key_prefix).toBe(raw_key.slice(0, 10));
    expect(pub.name).toBe('CI key');
    expect(pub.scopes).toEqual(['venues:read', 'slots:read', 'bookings:write']);
    expect(pub.revoked_at).toBeNull();
    expect(pub).not.toHaveProperty('key_hash');

    const doc = await apiKeyService.verify(raw_key);
    expect(doc).not.toBeNull();
    expect(String(doc!.owner_user_id)).toBe(ownerId);

    // Only the SHA-256 hash is persisted, never the raw key.
    const stored = await ApiKeyModel.findById(pub.id);
    expect(stored!.key_hash).not.toBe(raw_key);
    expect(stored!.key_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('bumps last_used_at on verify (fire-and-forget)', async () => {
    const { raw_key, pub } = await apiKeyService.create(ownerId, 'Used key');
    expect((await ApiKeyModel.findById(pub.id))!.last_used_at).toBeNull();

    await apiKeyService.verify(raw_key);
    let lastUsed: Date | null = null;
    for (let i = 0; i < 40 && !lastUsed; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
      lastUsed = (await ApiKeyModel.findById(pub.id))!.last_used_at;
    }
    expect(lastUsed).toBeTruthy();
  });

  it('verify returns null for unknown, empty and revoked keys', async () => {
    expect(await apiKeyService.verify('dk_live_definitely-not-a-key')).toBeNull();
    expect(await apiKeyService.verify('')).toBeNull();

    const { raw_key, pub } = await apiKeyService.create(ownerId, 'To revoke');
    const revoked = await apiKeyService.revoke(pub.id, ownerId);
    expect(revoked.revoked_at).not.toBeNull();
    expect(await apiKeyService.verify(raw_key)).toBeNull();
  });

  it('revoke is owner-scoped and rejects a second revoke', async () => {
    const { pub } = await apiKeyService.create(ownerId, 'Mine');
    await expect(
      apiKeyService.revoke(pub.id, new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
    await apiKeyService.revoke(pub.id, ownerId);
    await expect(apiKeyService.revoke(pub.id, ownerId)).rejects.toThrow(/not found|revoked/i);
    await expect(apiKeyService.revoke('nope', ownerId)).rejects.toThrow(/invalid key id/i);
  });

  it('listForOwner only returns the caller keys and never a hash', async () => {
    await apiKeyService.create(ownerId, 'Mine A');
    await apiKeyService.create(new Types.ObjectId().toString(), 'Someone else');
    const mine = await apiKeyService.listForOwner(ownerId);
    expect(mine).toHaveLength(1);
    expect(mine[0].name).toBe('Mine A');
    expect(mine[0]).not.toHaveProperty('key_hash');
    expect(mine[0].key_prefix.startsWith('dk_live_')).toBe(true);
  });

  it('rejects empty and over-long names', async () => {
    await expect(apiKeyService.create(ownerId, '   ')).rejects.toThrow(/required/i);
    await expect(apiKeyService.create(ownerId, 'x'.repeat(81))).rejects.toThrow(/80/);
  });

  it('serves the myApiKeysTable page with search, filter, sort and paging', async () => {
    await apiKeyService.create(ownerId, 'Alpha key');
    await apiKeyService.create(ownerId, 'Beta key');
    await apiKeyService.create(ownerId, 'Gamma integration');

    // Default sort matches listForOwner (created_at desc, newest first).
    const all = await apiKeyService.tableForOwner(ownerId);
    expect(all.total).toBe(3);
    expect(all.rows.map((k) => k.name)).toEqual(['Gamma integration', 'Beta key', 'Alpha key']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);
    expect(all.rows[0]).not.toHaveProperty('key_hash');

    // Search spans name and key_prefix.
    const byName = await apiKeyService.tableForOwner(ownerId, { search: 'beta' });
    expect(byName.rows.map((k) => k.name)).toEqual(['Beta key']);
    const byPrefix = await apiKeyService.tableForOwner(ownerId, { search: 'dk_live_' });
    expect(byPrefix.total).toBe(3);

    // Allowlisted contains filter narrows.
    const keysOnly = await apiKeyService.tableForOwner(ownerId, {
      filters: [{ field: 'name', op: 'contains', value: 'key' }],
    });
    expect(keysOnly.rows.map((k) => k.name)).toEqual(['Beta key', 'Alpha key']);

    // Allowlisted sort, both directions.
    const asc = await apiKeyService.tableForOwner(ownerId, { sort_by: 'name', sort_dir: 'asc' });
    expect(asc.rows.map((k) => k.name)).toEqual(['Alpha key', 'Beta key', 'Gamma integration']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await apiKeyService.tableForOwner(ownerId, {
      sort_by: 'name',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((k) => k.name)).toEqual(['Beta key']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('scopes myApiKeysTable to the owner — user A can never see user B rows', async () => {
    const otherId = new Types.ObjectId().toString();
    await apiKeyService.create(ownerId, 'Mine only');
    await apiKeyService.create(otherId, 'Theirs only');

    const mine = await apiKeyService.tableForOwner(ownerId);
    expect(mine.rows.map((k) => k.name)).toEqual(['Mine only']);
    expect(mine.rows.every((k) => k.owner_user_id === ownerId)).toBe(true);

    // Searching/filtering for the other user's key cannot widen the scope:
    // the owner baseFilter is $and-merged with every client filter.
    const searched = await apiKeyService.tableForOwner(ownerId, { search: 'Theirs' });
    expect(searched.total).toBe(0);
    const filtered = await apiKeyService.tableForOwner(ownerId, {
      filters: [{ field: 'name', op: 'eq', value: 'Theirs only' }],
    });
    expect(filtered.total).toBe(0);
  });
});
