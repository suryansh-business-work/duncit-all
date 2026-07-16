import { describe, expect, it } from 'vitest';
import {
  computeDashboard,
  type BrandRow,
  type OrderRow,
  type ProductRow,
} from '../../src/pages/WelcomePage/dashboard-metrics';

describe('computeDashboard', () => {
  it('returns zeroed stats for empty inputs', () => {
    const stats = computeDashboard([], [], []);
    expect(stats).toEqual({
      totalProducts: 0,
      lowStock: 0,
      outOfStock: 0,
      stockValue: 0,
      totalOrders: 0,
      revenue: 0,
      pendingFulfilment: 0,
      activeBrands: 0,
      brandProducts: 0,
    });
  });

  it('classifies stock: out of stock, low stock and healthy', () => {
    const products: ProductRow[] = [
      { available_count: 0, selling_price: 10, inventory_count: 3 }, // out of stock
      { available_count: 4, low_stock_alert: 5, selling_price: 2, inventory_count: 4 }, // low
      { available_count: 50, low_stock_alert: 5, selling_price: 1, inventory_count: 10 }, // healthy
    ];
    const stats = computeDashboard(products, [], []);
    expect(stats.outOfStock).toBe(1);
    expect(stats.lowStock).toBe(1);
    expect(stats.totalProducts).toBe(3);
    // 10*3 + 2*4 + 1*10 = 48
    expect(stats.stockValue).toBe(48);
  });

  it('uses the default low-stock threshold of 5 when none is set', () => {
    const products: ProductRow[] = [{ available_count: 5 }];
    const stats = computeDashboard(products, [], []);
    expect(stats.lowStock).toBe(1);
  });

  it('treats null numeric fields as zero', () => {
    const products: ProductRow[] = [
      { available_count: null, selling_price: null, inventory_count: null, low_stock_alert: null },
    ];
    const stats = computeDashboard(products, [], []);
    expect(stats.outOfStock).toBe(1);
    expect(stats.stockValue).toBe(0);
  });

  it('sums revenue and counts unsettled fulfilments as pending', () => {
    const orders: OrderRow[] = [
      { total: 100, fulfilment_status: 'PENDING' },
      { total: 50, fulfilment_status: 'DELIVERED' },
      { total: 25, fulfilment_status: null },
    ];
    const stats = computeDashboard([], orders, []);
    expect(stats.revenue).toBe(175);
    expect(stats.totalOrders).toBe(3);
    // DELIVERED is settled; PENDING and null are pending.
    expect(stats.pendingFulfilment).toBe(2);
  });

  it('aggregates brand product counts', () => {
    const brands: BrandRow[] = [
      { approved_product_count: 3 },
      { approved_product_count: null },
      { approved_product_count: 2 },
    ];
    const stats = computeDashboard([], [], brands);
    expect(stats.activeBrands).toBe(3);
    expect(stats.brandProducts).toBe(5);
  });
});
