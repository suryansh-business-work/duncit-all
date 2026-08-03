/**
 * Route helpers for the shared product editor, which serves both the Duncit
 * catalogue (`/inventory`) and one brand's catalogue
 * (`/catalog/brands/:brandId/products`). The `brandId` route param is what
 * tells the two apart — absent means the Duncit catalogue.
 */
export const productListPath = (brandId?: string) =>
  brandId ? `/catalog/brands/${brandId}/products` : '/inventory';

export const productEditPath = (productId: string, brandId?: string) =>
  `${productListPath(brandId)}/${productId}/edit`;

export const productListLabel = (brandId?: string) => (brandId ? 'Brand products' : 'Inventory');
