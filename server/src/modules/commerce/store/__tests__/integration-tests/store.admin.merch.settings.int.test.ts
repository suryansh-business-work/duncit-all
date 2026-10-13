import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { storeAdminMerchService as svc } from '../../store.admin.merch.service';

/**
 * The store's settings as the Ecomm portal saves them: every write is
 * re-validated server-side, whatever the form let through.
 */

const operator = { user: { id: new Types.ObjectId().toHexString() } } as unknown as GraphQLContext;
const anonymous = { user: null } as unknown as GraphQLContext;

const occasion = (over: Record<string, unknown> = {}) => ({
  label: 'Diwali',
  starts_at: '2026-11-01T00:00:00.000Z',
  ends_at: '2026-11-05T00:00:00.000Z',
  ...over,
});

describe('saveSettings — scalar fields', () => {
  it('creates the single settings document on first read, with defaults', async () => {
    const s = await svc.settings();
    expect(s.singleton_key).toBe('store');
    expect(s.cod_fee).toBe(0);
  });

  it('trims text, takes flags only when boolean, and records who saved', async () => {
    const saved = await svc.saveSettings(operator, {
      store_name: '  Duncit Pets  ',
      tagline: 42,
      cod_enabled: true,
      returns_enabled: 'yes',
      cod_fee: 49,
      flat_shipping_fee: -5,
      free_shipping_above: '999',
      support_email: null,
    });
    expect(saved?.store_name).toBe('Duncit Pets');
    expect(saved?.tagline).toBe('42');
    expect(saved?.cod_enabled).toBe(true);
    expect(saved?.cod_fee).toBe(49);
    expect(saved?.free_shipping_above).toBe(999);
    // A negative number is not a fee: it falls back to 0 rather than being saved.
    expect(saved?.flat_shipping_fee).toBe(0);
    expect(String(saved?.updated_by_id)).toBe(operator.user?.id);
  });

  it('leaves who saved empty when there is no signed-in user', async () => {
    const saved = await svc.saveSettings(anonymous, { store_name: 'Anon' });
    expect(saved?.updated_by_id ?? null).toBeNull();
  });

  it('refuses a nameless occasion given with no label key at all', async () => {
    await expect(svc.saveSettings(operator, { occasions: [{ starts_at: '2026-11-01', ends_at: '2026-11-02' }] })).rejects.toThrow(
      'Give occasion 1 a name'
    );
  });

  it('refuses discounts above 50% and a per-line quantity below 1', async () => {
    await expect(svc.saveSettings(operator, { prepaid_discount_pct: 51 })).rejects.toThrow('prepaid discount can be at most 50%');
    await expect(svc.saveSettings(operator, { autoship_discount_pct: 80 })).rejects.toThrow('autoship discount can be at most 50%');
    await expect(svc.saveSettings(operator, { max_qty_per_line: 0 })).rejects.toThrow('Allow at least 1 unit per item');
    const ok = await svc.saveSettings(operator, { prepaid_discount_pct: 50, max_qty_per_line: 1 });
    expect(ok).toMatchObject({ prepaid_discount_pct: 50, max_qty_per_line: 1 });
  });
});

describe('Razorpay account input', () => {
  it('reads a non-text account id as the default account', async () => {
    const saved = await svc.saveSettings(operator, { razorpay_account: 12345 });
    expect(saved?.razorpay_account).toBe('');
  });

  it('lists an account whose key id is not text as an unknown mode with no hint', async () => {
    await EnvEntryModel.create({ name: 'Odd', category: 'RAZORPAY', config: { key_id: 42 } });
    const [row] = await svc.razorpayAccounts();
    expect(row).toMatchObject({ name: 'Odd', mode: 'UNKNOWN', key_hint: '' });
  });
});

describe('saveSettings — lists', () => {
  it('keeps autoship weeks whole, in range, unique and ascending', async () => {
    const saved = await svc.saveSettings(operator, { autoship_frequencies: [8, 4, 4, 0, 27, 2.6, 'x'] });
    expect(saved?.autoship_frequencies).toEqual([2, 4, 8]);
  });

  it('keeps only six-digit pincodes, stripped of other characters', async () => {
    const saved = await svc.saveSettings(operator, { cod_blocked_pincodes: ['560 001', '11000', '110-001', '4110011', 'abc', ' '] });
    expect(saved?.cod_blocked_pincodes).toEqual(['560001', '110001']);
  });

  it('cleans return and cancel reasons', async () => {
    const saved = await svc.saveSettings(operator, { return_reasons: [' Damaged ', 'Damaged', ''], cancel_reasons: ['Changed my mind'] });
    expect(saved?.return_reasons).toEqual(['Damaged']);
    expect(saved?.cancel_reasons).toEqual(['Changed my mind']);
  });

  it('keeps only social links that have a label and an http(s) address', async () => {
    const saved = await svc.saveSettings(operator, {
      social_links: [
        { label: ' Instagram ', url: ' https://instagram.com/duncit ' },
        { label: '', url: 'https://x.com' },
        { label: 'Bad', url: 'javascript:alert(1)' },
        { url: 'https://nolabel.com' },
        { label: 'Nourl' },
      ],
    });
    expect(saved?.social_links.map((l) => ({ label: l.label, url: l.url }))).toEqual([{ label: 'Instagram', url: 'https://instagram.com/duncit' }]);
  });
});

describe('saveSettings — festive occasions', () => {
  it('saves a well-formed window with a slug made from the label', async () => {
    const saved = await svc.saveSettings(operator, {
      occasions: [occasion({ background_color: '#FFF4E5', announcement_text: 'Happy Diwali', logo_url: ' l.png ', sort_order: 2.9, is_active: false })],
    });
    expect(saved?.occasions).toHaveLength(1);
    expect(saved?.occasions[0]).toMatchObject({
      slug: 'diwali',
      label: 'Diwali',
      background_color: '#FFF4E5',
      announcement_text: 'Happy Diwali',
      logo_url: 'l.png',
      is_active: false,
      sort_order: 2,
    });
  });

  it('makes repeated slugs unique and falls back to a numbered slug when the label has no letters', async () => {
    const saved = await svc.saveSettings(operator, {
      occasions: [occasion(), occasion(), occasion({ label: '!!!', slug: '' }), occasion({ label: 'Holi', slug: 'custom-key' })],
    });
    expect(saved?.occasions.map((o) => o.slug)).toEqual(['diwali', 'diwali-2', 'occasion-3', 'custom-key']);
  });

  it('refuses a nameless window, a missing or unreadable date, an inverted window and a non-hex colour', async () => {
    await expect(svc.saveSettings(operator, { occasions: [occasion({ label: ' ' })] })).rejects.toThrow('Give occasion 1 a name');
    await expect(svc.saveSettings(operator, { occasions: [occasion({ starts_at: null })] })).rejects.toThrow('Set when "Diwali" starts and ends');
    await expect(svc.saveSettings(operator, { occasions: [occasion({ ends_at: 'not a date' })] })).rejects.toThrow('Set when "Diwali" starts and ends');
    await expect(
      svc.saveSettings(operator, { occasions: [occasion({ starts_at: '2026-11-05T00:00:00.000Z', ends_at: '2026-11-05T00:00:00.000Z' })] })
    ).rejects.toThrow('"Diwali" must end after it starts');
    await expect(svc.saveSettings(operator, { occasions: [occasion({ background_color: 'orange' })] })).rejects.toThrow(
      'must be a hex colour like #FFF4E5'
    );
  });

  it('keeps at most 24 windows', async () => {
    const many = Array.from({ length: 30 }, (_, i) => occasion({ label: `Sale ${i}` }));
    const saved = await svc.saveSettings(operator, { occasions: many });
    expect(saved?.occasions).toHaveLength(24);
  });
});
