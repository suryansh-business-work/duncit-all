import { PACKAGE_TYPES, type PackageType } from '@duncit/utils';
import { csvRecords, toCsv } from '../../../lib/csv';
import type { PackagingInput, PackagingRow } from './packaging-queries';

/**
 * The packaging CSV's columns. The first eight round-trip (edit and import
 * them back); the rest are read-only context the import ignores.
 */
export const PACKAGING_CSV_HEADERS = [
  'sku',
  'weight_kg',
  'length_cm',
  'breadth_cm',
  'height_cm',
  'package_type',
  'hsn_code',
  'is_fragile',
  'is_liquid',
  'shelf_life_days',
  'product_name',
  'variant_label',
  'chargeable_weight_kg',
  'missing',
] as const;

/** Rows as a CSV file's text; blank cells for values never entered. */
export function packagingCsv(rows: readonly PackagingRow[]): string {
  return toCsv(
    PACKAGING_CSV_HEADERS,
    rows.map((row) => ({
      ...row,
      weight_kg: row.weight_kg || '',
      length_cm: row.length_cm || '',
      breadth_cm: row.breadth_cm || '',
      height_cm: row.height_cm || '',
      shelf_life_days: row.shelf_life_days ?? '',
      missing: row.missing.join('; '),
    }))
  );
}

const TYPES = new Set<string>(PACKAGE_TYPES);
const number = (value: string) => (value === '' ? undefined : Number(value));
const flag = (value: string) => {
  const v = value.toLowerCase();
  if (v === 'true' || v === 'yes' || v === '1') return true;
  if (v === 'false' || v === 'no' || v === '0') return false;
  return undefined;
};

/** One CSV line as an import row: blank cells are left out, so they keep what is saved. */
function toImportRow(record: Record<string, string>): PackagingInput & { sku: string } {
  const type = record.package_type?.toUpperCase() ?? '';
  return {
    sku: record.sku ?? '',
    weight_kg: number(record.weight_kg ?? ''),
    length_cm: number(record.length_cm ?? ''),
    breadth_cm: number(record.breadth_cm ?? ''),
    height_cm: number(record.height_cm ?? ''),
    package_type: TYPES.has(type) ? (type as PackageType) : undefined,
    hsn_code: record.hsn_code || undefined,
    is_fragile: flag(record.is_fragile ?? ''),
    is_liquid: flag(record.is_liquid ?? ''),
    shelf_life_days: number(record.shelf_life_days ?? ''),
  };
}

/** A packaging CSV's rows that name a SKU. */
export function parsePackagingCsv(text: string) {
  return csvRecords(text)
    .filter((record) => record.sku)
    .map(toImportRow);
}
