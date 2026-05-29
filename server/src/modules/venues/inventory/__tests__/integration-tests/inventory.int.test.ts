import { inventoryService } from '../../inventory.service';

describe('inventoryService integration', () => {
  it('lists no products / requests on an empty dataset', async () => {
    expect(await inventoryService.list()).toEqual([]);
    expect(await inventoryService.listProductRequests()).toEqual([]);
    expect(await inventoryService.listAvailablePodProducts()).toEqual([]);
  });

  it('generates a unique SKU', async () => {
    const sku = await inventoryService.generateSku();
    expect(typeof sku).toBe('string');
    expect(sku.length).toBeGreaterThan(0);
  });
});
