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
});
