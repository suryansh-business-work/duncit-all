import { envEntryService } from '../../envEntry.service';
import { EnvEntryModel } from '../../envEntry.model';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

const cfg = (pairs: Record<string, any>) => pairs;

describe('envEntryService integration', () => {
  it('creates a multi-field EMAIL entry and returns the password (revealable in UI)', async () => {
    const created = await envEntryService.create({
      name: 'Sales SMTP',
      category: 'EMAIL',
      config: cfg({ host: 'smtp.test', port: 587, user: 'u', password: 'secret', from_address: 'a@b.com' }),
    });
    const config = Object.fromEntries(created!.config.map((p) => [p.key, p.value]));
    expect(config.host).toBe('smtp.test');
    expect(config.port).toBe('587');
    expect(config.password).toBe('secret'); // secrets are now returned for the Tech portal
    expect(created!.secrets.find((s) => s.key === 'has_password')?.present).toBe(true);
    expect(created!.is_default).toBe(true); // first in category
  });

  it('keeps a single default per category and supports multiple entries', async () => {
    const a = await envEntryService.create({ name: 'IK A', category: 'IMAGEKIT', is_default: true, config: cfg({ private_key: 'x' }) });
    const b = await envEntryService.create({ name: 'IK B', category: 'IMAGEKIT', config: cfg({ private_key: 'y' }) });
    expect((await envEntryService.list({ category: 'IMAGEKIT' })).length).toBe(2);
    await envEntryService.setDefault(b!.id);
    expect((await envEntryService.get(a!.id))?.is_default).toBe(false);
    expect((await envEntryService.get(b!.id))?.is_default).toBe(true);
  });

  it('does not overwrite a secret when the new value is blank', async () => {
    const created = await envEntryService.create({ name: 'T', category: 'TWILIO', config: cfg({ account_sid: 'AC', auth_token: 'tok' }) });
    const updated = await envEntryService.update(created!.id, { config: cfg({ auth_token: '' }) });
    expect(updated!.secrets.find((s) => s.key === 'has_auth_token')?.present).toBe(true);
  });

  it('promotes a new default when the current default is deleted', async () => {
    const a = await envEntryService.create({ name: 'P1', category: 'PEXELS', config: cfg({ api_key: 'a' }) });
    const b = await envEntryService.create({ name: 'P2', category: 'PEXELS', config: cfg({ api_key: 'b' }) });
    await envEntryService.remove(a!.id); // a was default (first)
    expect((await envEntryService.get(b!.id))?.is_default).toBe(true);
  });

  it('maps entries to a portal (add + remove) idempotently', async () => {
    const x = await envEntryService.create({ name: 'X', category: 'OPENAI', config: cfg({ api_key: 'k' }) });
    const y = await envEntryService.create({ name: 'Y', category: 'GOOGLE_MAPS', config: cfg({ maps_api_key: 'k' }) });
    await envEntryService.setPortalAssignments('crm', [x!.id, y!.id]);
    expect((await envEntryService.listForPortal('crm')).length).toBe(2);
    // Removing y from the set unassigns it but keeps x.
    await envEntryService.setPortalAssignments('crm', [x!.id]);
    const forCrm = await envEntryService.listForPortal('crm');
    expect(forCrm.map((e) => e.id)).toEqual([x!.id]);
    expect((await envEntryService.get(y!.id))?.assigned_portals).not.toContain('crm');
  });

  it('throws NOT_FOUND on missing ids', async () => {
    const id = '507f1f77bcf86cd799439011';
    await expect(envEntryService.update(id, {})).rejects.toThrow(/not found/i);
    await expect(envEntryService.remove(id)).rejects.toThrow(/not found/i);
    await expect(envEntryService.setDefault(id)).rejects.toThrow(/not found/i);
    await expect(envEntryService.test(id)).rejects.toThrow(/not found/i);
  });

  it('resolveRuntime + getRuntimeEnvValue read the default entry; no .env fallback for managed keys', async () => {
    await envEntryService.create({
      name: 'Default IK', category: 'IMAGEKIT', is_default: true,
      config: cfg({ public_key: 'pub', private_key: 'priv', url_endpoint: 'https://ik' }),
    });
    expect((await envEntryService.resolveRuntime('IMAGEKIT'))?.config.private_key).toBe('priv');
    expect(await getRuntimeEnvValue('IMAGEKIT_PRIVATE_KEY')).toBe('priv');
    expect(await getRuntimeEnvValue('IMAGEKIT_PUBLIC_KEY')).toBe('pub');

    // A managed key with NO entry must NOT read process.env.
    process.env.PEXELS_API_KEY = 'leak-from-env';
    expect(await getRuntimeEnvValue('PEXELS_API_KEY')).toBe('');
    delete process.env.PEXELS_API_KEY;

    // Unmapped key still falls through to process.env.
    process.env.SOME_UNMAPPED_KEY = 'env-val';
    expect(await getRuntimeEnvValue('SOME_UNMAPPED_KEY')).toBe('env-val');
    delete process.env.SOME_UNMAPPED_KEY;
    await EnvEntryModel.deleteMany({});
  });

  it('resolveForPortal uses the assigned entry, else the category default', async () => {
    const def = await envEntryService.create({ name: 'Default AI', category: 'OPENAI', is_default: true, config: cfg({ api_key: 'def' }) });
    const special = await envEntryService.create({ name: 'CRM AI', category: 'OPENAI', config: cfg({ api_key: 'crm' }) });
    await envEntryService.setPortalAssignments('crm', [special!.id]);

    // crm has its own assigned entry
    expect((await envEntryService.resolveForPortal('crm', 'OPENAI'))?.id).toBe(special!.id);
    // a portal with nothing assigned falls back to the default
    expect((await envEntryService.resolveForPortal('finance', 'OPENAI'))?.id).toBe(def!.id);
    await EnvEntryModel.deleteMany({});
  });

  it('test() stamps last_tested_at + last_test_ok', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const created = await envEntryService.create({ name: 'IKx', category: 'IMAGEKIT', config: cfg({ private_key: 'bad' }) });
    await envEntryService.test(created!.id);
    const after = await envEntryService.get(created!.id);
    expect(after?.last_tested_at).toBeTruthy();
    expect(after?.last_test_ok).toBe(false);
    delete (global as any).fetch;
  });

  it('records last_used_at on a successful test()', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const created = await envEntryService.create({ name: 'PX', category: 'PEXELS', config: cfg({ api_key: 'k' }) });
    expect((await envEntryService.test(created!.id)).ok).toBe(true);
    expect((await envEntryService.get(created!.id))?.last_used_at).toBeTruthy();
    delete (global as any).fetch;
  });

  it('serves the envEntriesTable page with search, filters, sort and paging', async () => {
    await envEntryService.create({ name: 'Primary SMTP', category: 'EMAIL', config: cfg({ host: 'smtp.a' }) });
    await envEntryService.create({
      name: 'Backup SMTP',
      category: 'EMAIL',
      description: 'fallback sender',
      config: cfg({ host: 'smtp.b' }),
    });
    const ik = await envEntryService.create({
      name: 'IK Main',
      category: 'IMAGEKIT',
      is_active: false,
      config: cfg({ private_key: 'x' }),
    });
    await envEntryService.setPortalAssignments('crm', [ik!.id]);

    // Default sort matches list(): category asc, default first, then name.
    const all = await envEntryService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((e) => e!.name)).toEqual(['Primary SMTP', 'Backup SMTP', 'IK Main']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name and description.
    const byName = await envEntryService.table({ search: 'backup' });
    expect(byName.rows.map((e) => e!.name)).toEqual(['Backup SMTP']);
    const byDescription = await envEntryService.table({ search: 'fallback' });
    expect(byDescription.rows.map((e) => e!.name)).toEqual(['Backup SMTP']);

    // Enum, boolean and portal-membership filters narrow.
    const email = await envEntryService.table({
      filters: [{ field: 'category', op: 'eq', value: 'EMAIL' }],
    });
    expect(email.total).toBe(2);
    const inactive = await envEntryService.table({ filters: [{ field: 'is_active', op: 'is_false' }] });
    expect(inactive.rows.map((e) => e!.name)).toEqual(['IK Main']);
    const forCrm = await envEntryService.table({
      filters: [{ field: 'assigned_portals', op: 'eq', value: 'crm' }],
    });
    expect(forCrm.rows.map((e) => e!.name)).toEqual(['IK Main']);

    // Allowlisted sort, both directions.
    const desc = await envEntryService.table({ sort_by: 'name', sort_dir: 'desc' });
    expect(desc.rows.map((e) => e!.name)).toEqual(['Primary SMTP', 'IK Main', 'Backup SMTP']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await envEntryService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((e) => e!.name)).toEqual(['Backup SMTP']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
