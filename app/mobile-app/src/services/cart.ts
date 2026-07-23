import { getItem, setItem } from '@/services/secure-storage';

const KEY = 'duncit.cart_lines';

/** One cart line — a product (or a specific variant of it) from one pod's shop.
 * RN twin of mWeb's CartLine (components/cart/CartContext.tsx). */
export interface CartLine {
  pod_id: string;
  pod_title: string;
  club_slug: string;
  product_id: string;
  variant_id: string;
  variant_label: string;
  product_name: string;
  image_url: string;
  unit_cost: number;
  quantity: number;
  max_quantity: number;
  /** Product threshold: line subtotal at/above which its delivery is free
   * (null/absent = the product has no free-delivery offer). */
  free_delivery_above?: number | null;
}

/** Whether a line's subtotal (qty × unit price) reaches its product's
 * free-delivery threshold — drives the client-side badge only; the shipping
 * quote's `free` flag stays authoritative per warehouse group. */
export const lineQualifiesFreeDelivery = (line: CartLine): boolean =>
  line.free_delivery_above != null && line.unit_cost * line.quantity >= line.free_delivery_above;

/** Read the persisted cart lines, dropping anything malformed. */
export async function getCartLines(): Promise<CartLine[]> {
  try {
    const raw = await getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((line) => line?.pod_id && line?.product_id) : [];
  } catch {
    return [];
  }
}

export async function setCartLines(lines: CartLine[]): Promise<void> {
  await setItem(KEY, JSON.stringify(lines));
}
