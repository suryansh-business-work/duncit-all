/**
 * The pod's type as the form reads it.
 *
 * The server's `PodType` is exactly FREE | PAID. The picker used to offer the
 * five legacy values (NATIVE_FREE, NON_NATIVE_PAID, …), which the GraphQL enum
 * refuses — so whatever the form holds is collapsed to the two the server
 * writes, the same way its own `LEGACY_POD_TYPE_MAP` collapses stored rows.
 */
export type PodTypeValue = 'FREE' | 'PAID';

/**
 * The names the picker offered before the enum collapsed. Nothing writes them
 * any more, but a caller that is still handed one (the admin AI fill is
 * prompted with them) recognises it here and normalises it.
 */
export const LEGACY_POD_TYPES: readonly string[] = [
  'NATIVE_FREE',
  'NATIVE_PAID',
  'NATIVE_PAID_PREMIUM',
  'NON_NATIVE_FREE',
  'NON_NATIVE_PAID',
];

/** A free pod: FREE, or a legacy value that meant free. */
export const isFreePodType = (podType: string | null | undefined): boolean =>
  (podType ?? '').includes('FREE');

/** FREE or PAID — anything that is not free is a paid pod. */
export const normalizePodType = (podType: string | null | undefined): PodTypeValue =>
  isFreePodType(podType) ? 'FREE' : 'PAID';
