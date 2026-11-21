import { describe, expect, it } from 'vitest';
import type { CrmServiceOffered } from '@/api/crm.types';
import { cleanServices, servicesToForm } from '@/forms/validation/services';

describe('cleanServices', () => {
  it('trims each service, fills missing names and descriptions with empty text', () => {
    expect(
      cleanServices([
        { service: ' Catering ', custom_name: null, description: ' Veg + Jain menus ' },
        { service: 'Other', custom_name: ' Live band ', description: undefined },
      ]),
    ).toEqual([
      { service: 'Catering', custom_name: '', description: 'Veg + Jain menus' },
      { service: 'Other', custom_name: 'Live band', description: '' },
    ]);
  });

  it('drops rows with no service, including rows that are only spaces', () => {
    const rows = [
      { service: '   ', custom_name: 'ignored', description: 'orphan' },
      { service: '', custom_name: '', description: '' },
      { service: 'Decor', custom_name: '', description: '' },
    ];
    expect(cleanServices(rows)).toEqual([{ service: 'Decor', custom_name: '', description: '' }]);
  });

  it('gives an empty list when the form has no services', () => {
    expect(cleanServices(undefined)).toEqual([]);
    expect(cleanServices([])).toEqual([]);
  });

  it('skips a missing row without throwing', () => {
    const rows = [null, { service: 'Sound', custom_name: null, description: null }] as unknown as CrmServiceOffered[];
    expect(cleanServices(rows)).toEqual([{ service: 'Sound', custom_name: '', description: '' }]);
  });
});

describe('servicesToForm', () => {
  it('turns saved services into form rows with empty text for nulls', () => {
    expect(
      servicesToForm([
        { service: 'Catering', custom_name: null, description: 'Veg only' },
        { service: 'Other', custom_name: 'Fireworks', description: null },
      ]),
    ).toEqual([
      { service: 'Catering', custom_name: '', description: 'Veg only' },
      { service: 'Other', custom_name: 'Fireworks', description: '' },
    ]);
  });

  it('gives an empty list for a lead saved before services existed', () => {
    expect(servicesToForm(null)).toEqual([]);
    expect(servicesToForm(undefined)).toEqual([]);
  });

  it('round-trips with cleanServices', () => {
    const saved = [{ service: 'Catering', custom_name: '', description: 'Veg only' }];
    expect(cleanServices(servicesToForm(saved))).toEqual(saved);
  });
});
