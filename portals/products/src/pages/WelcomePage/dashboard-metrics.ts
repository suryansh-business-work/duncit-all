export interface ProductRow {
  inventory_count?: number | null;
  available_count?: number | null;
  selling_price?: number | null;
  low_stock_alert?: number | null;
}

export interface OrderRow {
  total?: number | null;
  fulfilment_status?: string | null;
}

export interface BrandRow {
  approved_product_count?: number | null;
}

export interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  stockValue: number;
  totalOrders: number;
  revenue: number;
  pendingFulfilment: number;
  activeBrands: number;
  brandProducts: number;
}

// A fulfilment is "done" (not pending) once it reaches one of these states.
const SETTLED = new Set(['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED']);

const num = (value?: number | null) => (typeof value === 'number' ? value : 0);

/** Aggregate the products/orders/brands lists into the dashboard KPIs. Pure so
 * it can be unit-tested without the network (Task B item 5). */
export function computeDashboard(
  products: ProductRow[],
  orders: OrderRow[],
  brands: BrandRow[],
): DashboardStats {
  let lowStock = 0;
  let outOfStock = 0;
  let stockValue = 0;
  products.forEach((product) => {
    const available = num(product.available_count);
    const threshold = num(product.low_stock_alert) || 5;
    if (available <= 0) outOfStock += 1;
    else if (available <= threshold) lowStock += 1;
    stockValue += num(product.selling_price) * num(product.inventory_count);
  });

  let revenue = 0;
  let pendingFulfilment = 0;
  orders.forEach((order) => {
    revenue += num(order.total);
    if (!SETTLED.has(String(order.fulfilment_status ?? ''))) pendingFulfilment += 1;
  });

  const brandProducts = brands.reduce((sum, brand) => sum + num(brand.approved_product_count), 0);

  return {
    totalProducts: products.length,
    lowStock,
    outOfStock,
    stockValue,
    totalOrders: orders.length,
    revenue,
    pendingFulfilment,
    activeBrands: brands.length,
    brandProducts,
  };
}
