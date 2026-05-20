import { describe, expect, it } from 'vitest';
import { blockSlotInitialValues, blockSlotSchema, toBlockInput } from './block-slot.schema';

describe('blockSlotSchema', () => {
  it('rejects empty from/to', async () => {
    const error = await blockSlotSchema
      .validate(blockSlotInitialValues, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/from/i);
    expect(error.errors.join(' ')).toMatch(/to/i);
  });

  it('rejects to <= from', async () => {
    const error = await blockSlotSchema
      .validate(
        { template_id: '', from: '2026-06-10T10:00:00Z', to: '2026-06-10T09:00:00Z', reason: 'Maintenance day' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/to must be after/i);
  });

  it('rejects short reason', async () => {
    const error = await blockSlotSchema
      .validate(
        { template_id: '', from: '2026-06-10T10:00:00Z', to: '2026-06-10T12:00:00Z', reason: 'no' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/reason/i);
  });

  it('accepts valid input and nullifies empty template_id', async () => {
    const parsed = await blockSlotSchema.validate({
      template_id: '',
      from: '2026-06-10T10:00:00Z',
      to: '2026-06-10T12:00:00Z',
      reason: 'Maintenance day for the venue',
    });
    const input = toBlockInput(parsed);
    expect(input.template_id).toBeNull();
    expect(input.from.endsWith('Z')).toBe(true);
  });
});
