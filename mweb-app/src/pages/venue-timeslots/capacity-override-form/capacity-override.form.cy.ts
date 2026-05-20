import { describe, expect, it } from 'vitest';
import {
  capacityOverrideInitialValues,
  capacityOverrideSchema,
  toOverrideInput,
} from './capacity-override.schema';

describe('capacityOverrideSchema', () => {
  it('rejects empty template_id and date', async () => {
    const error = await capacityOverrideSchema
      .validate(capacityOverrideInitialValues, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/template/i);
    expect(error.errors.join(' ')).toMatch(/date/i);
  });

  it('rejects negative capacity', async () => {
    const error = await capacityOverrideSchema
      .validate(
        {
          ...capacityOverrideInitialValues,
          template_id: 't1',
          occurrence_date: '2026-06-10',
          capacity_override: '-1',
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/capacity/i);
  });

  it('rejects note over 280 chars', async () => {
    const error = await capacityOverrideSchema
      .validate(
        {
          ...capacityOverrideInitialValues,
          template_id: 't1',
          occurrence_date: '2026-06-10',
          note: 'x'.repeat(281),
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/280/);
  });

  it('accepts valid input and produces a typed input', async () => {
    const values = {
      template_id: 't1',
      occurrence_date: '2026-06-10',
      capacity_override: '5',
      is_cancelled: false,
      note: 'limited seats today',
    };
    await capacityOverrideSchema.validate(values);
    const input = toOverrideInput(values);
    expect(input.capacity_override).toBe(5);
    expect(input.occurrence_date).toMatch(/2026-06-10/);
  });

  it('passes null capacity_override when blank', () => {
    const input = toOverrideInput({
      template_id: 't1',
      occurrence_date: '2026-06-10',
      capacity_override: '',
      is_cancelled: true,
      note: '',
    });
    expect(input.capacity_override).toBeNull();
    expect(input.is_cancelled).toBe(true);
  });
});
