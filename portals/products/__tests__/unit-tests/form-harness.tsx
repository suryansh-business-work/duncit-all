import type { ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { blankProductForm, type InventoryProductFormValues } from '../../src/pages/inventory-page/inventory-product-page/types';

/**
 * Wraps children in a react-hook-form context seeded with the blank product
 * form so the inventory `*Section` components (which call `useFormContext`)
 * render standalone.
 */
export function ProductFormHarness({
  children,
  values,
}: Readonly<{ children: ReactNode; values?: Partial<InventoryProductFormValues> }>) {
  const methods = useForm<InventoryProductFormValues>({
    defaultValues: { ...blankProductForm, ...values },
    mode: 'onChange',
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}
