import { Types } from 'mongoose';
import { GiftCardDesignModel } from '../../giftCardDesign.model';
import { GiftCardActivityModel } from '../../giftCardActivity.model';
import { giftCardDesignService } from '../../giftCardDesign.service';

/**
 * The Loyalty catalogue keeps exactly one default design for members to buy,
 * never lets printed stock go below zero, and audits every business change.
 */

const admin = new Types.ObjectId().toHexString();
const FRONT = 'https://ik.imagekit.io/duncit/gift-cards/front.png';
const BACK = 'https://ik.imagekit.io/duncit/gift-cards/back.png';

const create = (over: Record<string, unknown> = {}) =>
  giftCardDesignService.create(
    { name: 'Classic', category: 'Evergreen', front_image_url: FRONT, back_image_url: BACK, ...over },
    admin
  );

const actions = async (designId: string) =>
  (await GiftCardActivityModel.find({ entity_id: designId }).sort({ created_at: 1 }).lean()).map((a) => a.action);

beforeAll(async () => {
  await GiftCardDesignModel.init();
});

describe('giftCardDesignService.create', () => {
  it('makes the first design the default and later ones not', async () => {
    const first = await create();
    const second = await create({ name: 'Festive' });
    expect(first).toMatchObject({ is_default: true, is_active: true, physical_stock: 0, category: 'Evergreen' });
    expect(second.is_default).toBe(false);
    expect(await actions(first.id)).toEqual(['DESIGN_CREATED']);
  });

  it.each([
    [{ name: '   ' }, 'Give the design a name', 'name'],
    [{ front_image_url: '' }, 'Upload an image for this side of the card', 'front_image_url'],
    [{ back_image_url: 'http://insecure.example/back.png' }, 'Upload an image for this side of the card', 'back_image_url'],
  ])('refuses %j', async (over, message, field) => {
    await expect(create(over)).rejects.toMatchObject({ message, extensions: { code: 'BAD_USER_INPUT', field } });
    expect(await GiftCardDesignModel.countDocuments()).toBe(0);
  });
});

describe('giftCardDesignService.update', () => {
  it('changes only what was sent and records which fields changed', async () => {
    const design = await create();
    const updated = await giftCardDesignService.update(design.id, { name: 'Classic Gold', sort_order: 3 }, admin);
    expect(updated).toMatchObject({ name: 'Classic Gold', sort_order: 3, front_image_url: FRONT, category: 'Evergreen' });
    const row = await GiftCardActivityModel.findOne({ entity_id: design.id, action: 'DESIGN_UPDATED' }).lean();
    expect(row?.note).toBe('Changed name, sort_order');
    expect(String(row?.actor_user_id)).toBe(admin);
  });

  it('will not switch off the default design, but switches off any other', async () => {
    const def = await create();
    const other = await create({ name: 'Festive' });
    await expect(giftCardDesignService.update(def.id, { is_active: false }, admin)).rejects.toMatchObject({
      extensions: { field: 'is_active' },
    });
    expect((await giftCardDesignService.update(other.id, { is_active: false }, admin)).is_active).toBe(false);
  });

  it('answers NOT_FOUND for a design that does not exist', async () => {
    await expect(
      giftCardDesignService.update(new Types.ObjectId().toHexString(), { name: 'x' }, admin)
    ).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('giftCardDesignService.setDefault', () => {
  it('moves the default in one step and switches the new default on', async () => {
    const first = await create();
    const second = await create({ name: 'Festive' });
    await giftCardDesignService.update(second.id, { is_active: false }, admin);

    const now = await giftCardDesignService.setDefault(second.id, admin);
    expect(now).toMatchObject({ is_default: true, is_active: true });
    expect((await giftCardDesignService.byId(first.id)).is_default).toBe(false);
    expect(await GiftCardDesignModel.countDocuments({ is_default: true })).toBe(1);
    expect((await giftCardDesignService.defaultDesign())?.name).toBe('Festive');
    expect(await actions(second.id)).toContain('DESIGN_DEFAULT_SET');
  });

  it('is a no-op on the design that is already the default', async () => {
    const first = await create();
    await giftCardDesignService.setDefault(first.id, admin);
    expect(await actions(first.id)).toEqual(['DESIGN_CREATED']);
  });
});

describe('giftCardDesignService.adjustStock', () => {
  it('adds a print run and removes damaged cards, with the reason audited', async () => {
    const design = await create();
    expect((await giftCardDesignService.adjustStock(design.id, 250, 'Print run #4', admin)).physical_stock).toBe(250);
    expect((await giftCardDesignService.adjustStock(design.id, -10, 'Water damage', admin)).physical_stock).toBe(240);
    const notes = (await GiftCardActivityModel.find({ entity_id: design.id, action: 'STOCK_ADJUSTED' }).sort({ created_at: 1 }).lean()).map((a) => a.note);
    expect(notes).toEqual(['+250 (Print run #4)', '-10 (Water damage)']);
  });

  it('never takes stock below zero', async () => {
    const design = await create();
    await giftCardDesignService.adjustStock(design.id, 5, 'Print run', admin);
    await expect(giftCardDesignService.adjustStock(design.id, -6, 'Lost', admin)).rejects.toThrow(
      'Only 5 cards are in stock'
    );
    expect((await giftCardDesignService.byId(design.id)).physical_stock).toBe(5);
  });

  it.each([
    [0, 'Print run', 'delta'],
    [100_001, 'Print run', 'delta'],
    [10, '  ', 'reason'],
  ])('refuses a change of %p with reason %j', async (delta, reason, field) => {
    const design = await create();
    await expect(giftCardDesignService.adjustStock(design.id, delta, reason, admin)).rejects.toMatchObject({
      extensions: { field },
    });
  });
});

describe('giftCardDesignService reads', () => {
  it('lists the categories in use, sorted, without blanks', async () => {
    await create({ category: 'Festive' });
    await create({ category: 'Birthday' });
    await create({ category: '' });
    await create({ category: 'Festive' });
    expect(await giftCardDesignService.categories()).toEqual(['Birthday', 'Festive']);
  });

  it('searches the table by name and puts the default first', async () => {
    await create({ name: 'Classic' });
    await create({ name: 'Diwali Lights' });
    const all = await giftCardDesignService.table({ page: 1, page_size: 10 } as never);
    expect(all.rows.map((r) => r.name)).toEqual(['Classic', 'Diwali Lights']);
    const found = await giftCardDesignService.table({ page: 1, page_size: 10, search: 'diwali' } as never);
    expect(found.rows.map((r) => r.name)).toEqual(['Diwali Lights']);
  });

  it('has no default design until one is created', async () => {
    expect(await giftCardDesignService.defaultDesign()).toBeNull();
  });
});
