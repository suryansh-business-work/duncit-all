import { describe, expect, it } from 'vitest';
import { flattenErrors } from '@/forms/flattenErrors';

describe('flattenErrors', () => {
  it('returns an empty list for an empty error tree', () => {
    expect(flattenErrors({})).toEqual([]);
  });

  it('flattens a top-level string error with a known label', () => {
    const result = flattenErrors({ venue_name: 'Venue name is required' });
    expect(result).toEqual([
      { path: 'venue_name', label: 'Venue name', message: 'Venue name is required' },
    ]);
  });

  it('humanises unknown paths with title-casing', () => {
    const result = flattenErrors({ random_thing: 'Bad' });
    expect(result[0].label).toBe('Random Thing');
    expect(result[0].path).toBe('random_thing');
  });

  it('walks arrays into bracketed paths', () => {
    const result = flattenErrors({
      contacts: [
        { mobile_number: 'Required' },
        undefined,
        { email: 'Invalid' },
      ],
    } as any);
    const paths = result.map((r) => r.path);
    expect(paths).toContain('contacts[0].mobile_number');
    expect(paths).toContain('contacts[2].email');
    expect(result).toHaveLength(2);
  });

  it('uses the explicit label override for primary contact paths', () => {
    const result = flattenErrors({
      contacts: [{ mobile_number: 'Primary contact mobile is required' }],
    });
    expect(result[0].label).toBe('Primary contact mobile');
  });

  it('walks deep objects via dotted paths', () => {
    const result = flattenErrors({ services_offered: [{ custom_name: 'Required' }] } as any);
    expect(result[0].path).toBe('services_offered[0].custom_name');
  });

  it('surfaces the super category label', () => {
    const result = flattenErrors({ super_category_id: 'Super category is required' });
    expect(result[0].label).toBe('Super category');
  });
});
