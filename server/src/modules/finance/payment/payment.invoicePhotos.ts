import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { logs } from '@observability/log';
import { idText } from '@modules/commerce/store/store.shared';
import type { IPayment } from './payment.model';

/**
 * The photo printed beside each invoice line: the pod's cover next to the
 * booking, each product's own shot next to the product.
 *
 * A store line already carries the photo it was sold with; a pod-shop line
 * only names its product, so those are read in one query. Read at render time
 * rather than frozen on the payment, so invoices for orders placed before this
 * existed get their photos too.
 */
export interface InvoiceLinePhotos {
  pod?: string;
  /** Product photo by product id, for lines that did not carry one. */
  products: ReadonlyMap<string, string>;
}

export const NO_LINE_PHOTOS: InvoiceLinePhotos = { products: new Map() };

/** The product lines frozen on the payment's metadata. */
export function paymentProductLines(doc: Pick<IPayment, 'metadata'>): Record<string, unknown>[] {
  const lines = doc.metadata?.product_lines;
  return Array.isArray(lines) ? (lines as Record<string, unknown>[]) : [];
}

/** A product line's own photo, when the checkout stored one with it. */
export const lineOwnPhoto = (line: Record<string, unknown>): string =>
  typeof line.image_url === 'string' ? line.image_url : '';

const firstPhoto = (product: { image_url?: string; images?: string[] }): string =>
  product.image_url || (product.images ?? []).find(Boolean) || '';

export async function invoiceLinePhotos(doc: Pick<IPayment, 'pod_id' | 'metadata' | 'payment_id'>): Promise<InvoiceLinePhotos> {
  try {
    const productIds = [
      ...new Set(
        paymentProductLines(doc)
          .filter((line) => !lineOwnPhoto(line))
          .map((line) => idText(line.product_id))
          .filter((id) => Types.ObjectId.isValid(id))
      ),
    ];
    const [pod, products] = await Promise.all([
      doc.pod_id ? PodModel.findById(doc.pod_id).select('pod_images_and_videos').lean() : null,
      productIds.length > 0
        ? InventoryProductModel.find({ _id: { $in: productIds } }).select('image_url images').lean()
        : [],
    ]);
    return {
      pod: pod?.pod_images_and_videos?.find((media) => media.type === 'IMAGE' && media.url)?.url,
      products: new Map(products.map((product) => [String(product._id), firstPhoto(product)] as const).filter(([, url]) => url)),
    };
  } catch (error) {
    // A photo is decoration: the invoice still renders, with initial tiles.
    logs.server.warn('payment', 'invoiceLinePhotos', {
      paymentId: doc.payment_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NO_LINE_PHOTOS;
  }
}
