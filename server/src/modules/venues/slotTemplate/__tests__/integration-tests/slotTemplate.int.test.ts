import { Types } from 'mongoose';
import { slotTemplateService } from '../../slotTemplate.service';

const ownerId = new Types.ObjectId().toString();

const config = (over: Record<string, unknown> = {}) => ({
  weekdays: [1, 3, 5],
  start_time: '10:00',
  end_time: '11:00',
  default_price: 399,
  per_day_price: [{ weekday: 5, price: 499 }],
  ...over,
});

describe('slotTemplateService integration', () => {
  it('creates, lists, and keeps a single default per owner', async () => {
    const a = await slotTemplateService.create(ownerId, { name: 'Weekday eves', config: config() });
    expect(a.name).toBe('Weekday eves');
    expect(a.config.weekdays).toEqual([1, 3, 5]);
    expect(a.config.per_day_price).toEqual([{ weekday: 5, price: 499 }]);

    const b = await slotTemplateService.create(ownerId, { name: 'Default one', is_default: true, config: config() });
    expect(b.is_default).toBe(true);

    const c = await slotTemplateService.create(ownerId, { name: 'New default', is_default: true, config: config() });
    const mine = await slotTemplateService.listMine(ownerId);
    expect(mine).toHaveLength(3);
    expect(mine.filter((t) => t.is_default)).toHaveLength(1);
    expect(mine.find((t) => t.is_default)!.id).toBe(c.id);
  });

  it('validates the config and the name', async () => {
    await expect(
      slotTemplateService.create(ownerId, { name: 'X', config: config({ weekdays: [] }) })
    ).rejects.toThrow(/weekdays/i);
    await expect(
      slotTemplateService.create(ownerId, { name: 'X', config: config({ start_time: '12:00', end_time: '11:00' }) })
    ).rejects.toThrow(/after start_time/i);
    await expect(
      slotTemplateService.create(ownerId, { name: '   ', config: config() })
    ).rejects.toThrow(/name is required/i);
  });

  it('deletes only your own templates and can set a default', async () => {
    const t = await slotTemplateService.create(ownerId, { name: 'Mine', config: config() });
    await expect(
      slotTemplateService.remove(new Types.ObjectId().toString(), t.id)
    ).rejects.toThrow(/not your template/i);

    const def = await slotTemplateService.setDefault(ownerId, t.id);
    expect(def.is_default).toBe(true);

    expect(await slotTemplateService.remove(ownerId, t.id)).toBe(true);
  });
});
