import { describe, expect, it } from 'vitest';
import {
  clubAdminToValues,
  valuesToClubAdminInput,
} from '../../../src/club-admins/editor/mappers';
import { clubAdminRecord } from '../../fixtures';

describe('clubAdminToValues', () => {
  it('carries the record onto the form and reads the clubs as ids', () => {
    const values = clubAdminToValues(clubAdminRecord);
    expect(values.id).toBe(clubAdminRecord.id);
    expect(values.user_id).toBe(clubAdminRecord.user_id);
    expect(values.full_name).toBe('Kabir Sethi');
    expect(values.commission_pct).toBe(15);
    // The clubs live on Club.admin_user_ids, so the form holds the ID set it is
    // about to assign — not the names it displays.
    expect(values.club_ids).toEqual([
      '66c0000000000000000000e1',
      '66c0000000000000000000e2',
    ]);
  });

  it('pairs each category id with the name the server resolved', () => {
    const { category } = clubAdminToValues(clubAdminRecord);
    expect(category.super_id).toBe('66a0000000000000000000a1');
    expect(category.super_name).toBe('Social');
    expect(category.sub_id).toBe('66a0000000000000000000c3');
    expect(category.sub_name).toBe('Catan Night');
  });

  it('reads a record with nothing assigned or set without producing nulls', () => {
    const values = clubAdminToValues({
      ...clubAdminRecord,
      commission_pct: null,
      phone: '',
      super_category: null,
      super_category_id: null,
      category: null,
      category_id: null,
      sub_category: null,
      sub_category_id: null,
      assigned_clubs: [],
    });
    expect(values.commission_pct).toBe(0);
    expect(values.phone).toBe('');
    expect(values.category.super_id).toBe('');
    expect(values.category.sub_name).toBe('');
    expect(values.club_ids).toEqual([]);
  });
});

describe('valuesToClubAdminInput', () => {
  it('includes the commission for somebody who can govern', () => {
    const input = valuesToClubAdminInput(clubAdminToValues(clubAdminRecord), true);
    expect(input.commission_pct).toBe(15);
  });

  it('OMITS the commission for a console-role editor', () => {
    // The details mutation carries commission_pct and is not gated on it, so
    // sending an unchanged copy would still be writing a money field through a
    // door that does not check. Omitting leaves the stored value alone.
    const input = valuesToClubAdminInput(clubAdminToValues(clubAdminRecord), false);
    expect('commission_pct' in input).toBe(false);
    // Everything that IS a detail still goes.
    expect(input.full_name).toBe('Kabir Sethi');
    expect(input.email).toBe('kabir.sethi@example.com');
  });

  it('sends a zero commission as null so the platform default applies', () => {
    const values = clubAdminToValues(clubAdminRecord);
    values.commission_pct = 0;
    expect(valuesToClubAdminInput(values, true).commission_pct).toBeNull();
  });

  it('sends an unpicked category level as null, not as an empty string', () => {
    const values = clubAdminToValues(clubAdminRecord);
    values.category = { ...values.category, sub_id: '', category_id: '' };
    const input = valuesToClubAdminInput(values, true);
    expect(input.sub_category_id).toBeNull();
    expect(input.category_id).toBeNull();
    expect(input.super_category_id).toBe('66a0000000000000000000a1');
  });
});
