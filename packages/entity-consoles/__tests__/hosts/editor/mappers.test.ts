import { describe, expect, it } from 'vitest';
import {
  hostToValues,
  valuesToHostCategories,
  valuesToHostStep1,
  valuesToHostStep2,
  valuesToHostStep3,
} from '../../../src/hosts/editor/mappers';
import { hostRecord } from '../../fixtures';

describe('hostToValues', () => {
  it('carries the record onto the form, including the payout block', () => {
    const values = hostToValues(hostRecord);
    expect(values.id).toBe(hostRecord.id);
    expect(values.user_id).toBe(hostRecord.user_id);
    expect(values.full_name).toBe('Ananya Iyer');
    expect(values.aadhar_number).toBe('412345678901');
    expect(values.police_verification_url).toContain('317.pdf');
    expect(values.bank_account.upi_id).toBe('ananya@okhdfcbank');
    expect(values.host_commission_pct).toBe(12);
  });

  it('maps every category row onto the picker shape, complete or not', () => {
    // Both rows survive the read — the form has to SHOW the half-filled one so
    // somebody can finish or remove it. Dropping happens on save, not here.
    const { categories } = hostToValues(hostRecord);
    expect(categories).toHaveLength(2);
    expect(categories[0]).toEqual({
      super_id: '66a0000000000000000000a1',
      super_name: 'Social',
      category_id: '66a0000000000000000000b2',
      category_name: 'Board Games',
      sub_id: '66a0000000000000000000c3',
      sub_name: 'Catan Night',
    });
    expect(categories[1].sub_id).toBe('');
  });

  it('opens correctly on a record where every NULLABLE field is null', () => {
    // dob, payout_method, host_commission_pct and the three category ids are the
    // only fields this query can answer null for; the rest are non-null and carry
    // no fallback on purpose.
    const values = hostToValues({
      ...hostRecord,
      host_no: null,
      dob: null,
      host_commission_pct: null,
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
      bank_account: { ...hostRecord.bank_account, payout_method: null },
      host_categories: [
        {
          super_category_id: null,
          category_id: null,
          sub_category_id: null,
          super_category_name: 'Social',
          category_name: 'Board Games',
          sub_category_name: 'Catan Night',
          request_no: '',
        },
      ],
    });

    expect(values.dob).toBe('');
    expect(values.bank_account.payout_method).toBe('');
    // Null and 0 both mean inherit, and the form shows both as 0.
    expect(values.host_commission_pct).toBe(0);
    expect(values.categories[0].super_id).toBe('');
    expect(values.categories[0].sub_id).toBe('');
    // The names survive so the row still says what it was approved under.
    expect(values.categories[0].sub_name).toBe('Catan Night');
  });

  it('reads an explicit 0 commission the same as an unset one', () => {
    expect(hostToValues({ ...hostRecord, host_commission_pct: 0 }).host_commission_pct).toBe(0);
  });

  it('reads a host with no categories and no tags', () => {
    const values = hostToValues({ ...hostRecord, host_categories: [], tags: [] });
    expect(values.categories).toEqual([]);
    expect(values.tags).toEqual([]);
  });
});

describe('valuesToHostStep1', () => {
  it('omits an empty date of birth', () => {
    const values = hostToValues({ ...hostRecord, dob: null });
    expect(valuesToHostStep1(values).dob).toBeUndefined();
  });

  it('sends the identity fields', () => {
    const step1 = valuesToHostStep1(hostToValues(hostRecord));
    expect(step1).toEqual({
      full_name: 'Ananya Iyer',
      email: 'ananya.iyer@example.com',
      phone: '9820045612',
      dob: '1994-11-02',
    });
  });
});

describe('valuesToHostStep2 and Step3', () => {
  it('splits the identity documents from the verification block', () => {
    const values = hostToValues(hostRecord);
    expect(valuesToHostStep2(values)).toEqual({
      aadhar_number: '412345678901',
      pan_number: 'AFZPI1234K',
      passport_photo_url: 'https://ik.imagekit.io/duncit/hosts/317.jpg',
    });
    const step3 = valuesToHostStep3(values);
    expect(step3.full_address).toContain('Powai');
    expect(step3.tags).toEqual(['repeat-host']);
    expect(step3.bank_account.payout_method).toBe('UPI');
  });
});

describe('valuesToHostCategories', () => {
  it('drops a row whose Super/Category/Sub triple is incomplete', () => {
    // The server rejects a partial triple outright, so one abandoned row must
    // not fail the whole save.
    const categories = valuesToHostCategories(hostToValues(hostRecord));
    expect(categories).toEqual([
      {
        super_category_id: '66a0000000000000000000a1',
        category_id: '66a0000000000000000000b2',
        sub_category_id: '66a0000000000000000000c3',
      },
    ]);
  });

  it('sends nothing when no row is complete', () => {
    const values = hostToValues(hostRecord);
    values.categories = [
      { super_id: 'a', super_name: '', category_id: '', category_name: '', sub_id: '', sub_name: '' },
    ];
    expect(valuesToHostCategories(values)).toEqual([]);
  });

  it('keeps every complete row — a host may run several', () => {
    const values = hostToValues(hostRecord);
    values.categories = [
      { super_id: 'a', super_name: '', category_id: 'b', category_name: '', sub_id: 'c', sub_name: '' },
      { super_id: 'd', super_name: '', category_id: 'e', category_name: '', sub_id: 'f', sub_name: '' },
    ];
    expect(valuesToHostCategories(values)).toHaveLength(2);
  });
});
