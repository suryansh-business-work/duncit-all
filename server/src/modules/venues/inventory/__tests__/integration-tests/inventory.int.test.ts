import { Types } from 'mongoose';
import { inventoryService } from '../../inventory.service';
import { InventoryProductModel } from '../../inventory.model';

describe('inventoryService integration', () => {
  it('lists no products / requests on an empty dataset', async () => {
    expect(await inventoryService.list()).toEqual([]);
    expect(await inventoryService.listProductRequests()).toEqual([]);
    expect(await inventoryService.listAvailablePodProducts()).toEqual([]);
  });

  it('reads a single product by id with its public detail fields (powers publicInventoryProduct)', async () => {
    const id = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: id,
      product_name: 'Drum sticks',
      brand_name: 'Vic Firth',
      description: 'Maple 5A drumsticks for practice and stage',
      images: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
    } as never);

    const pub = await inventoryService.getById(String(id));
    expect(pub?.product_name).toBe('Drum sticks');
    expect(pub?.brand_name).toBe('Vic Firth');
    expect(pub?.description).toContain('Maple');
    expect(pub?.images).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);

    // A missing id resolves to null (dialog shows nothing rather than crashing).
    expect(await inventoryService.getById(new Types.ObjectId().toString())).toBeNull();
  });

  it('generates a unique SKU', async () => {
    const sku = await inventoryService.generateSku();
    expect(typeof sku).toBe('string');
    expect(sku.length).toBeGreaterThan(0);
  });
});
