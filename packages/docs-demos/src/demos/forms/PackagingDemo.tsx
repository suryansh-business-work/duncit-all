import { useForm } from 'react-hook-form';
import { flattenCatalogue, PACKAGING_BUNDLE } from '@duncit/i18n';
import { PackagingFields, type PackagingTranslate } from '@duncit/forms';

export interface PackagingMock {
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  hsn_code: string;
  /** Marks the four measurements required, as the E-commerce parcel edit before a booking does. */
  required: boolean;
}

const PACKAGING_TEXT = flattenCatalogue(PACKAGING_BUNDLE);

/** The shipped English, with {placeholders} filled — what a portal's t() answers. */
const packagingT: PackagingTranslate = (key, options) =>
  Object.entries(options?.vars ?? {}).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    PACKAGING_TEXT[key] ?? key
  );

/** A real form around the section, seeded from the mock. */
export function PackagingDemo({ mock }: Readonly<{ mock: PackagingMock }>) {
  const { required, ...parcel } = mock;
  const { control, setValue } = useForm({
    values: { ...parcel, package_type: 'POLYBAG', shelf_life_days: 365, is_fragile: false, is_liquid: false },
  });
  return <PackagingFields control={control} setValue={setValue} t={packagingT} required={required} />;
}
