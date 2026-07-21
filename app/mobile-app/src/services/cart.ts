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
}

/** Read the persisted cart lines, dropping anything malformed. */
export async function getCartLines(): Promise<CartLine[]> {
  try {
    const raw = await getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((line) => line && line.pod_id && line.product_id)
      : [];
  } catch {
    return [];
  }
}

export async function setCartLines(lines: CartLine[]): Promise<void> {
  await setItem(KEY, JSON.stringify(lines));
}
