/**
 * A real product-listing form (same schema, same defaults) for the wizard's
 * field components, which take `control`/`watch`/`setValue` from the form that
 * ListProductsForm owns in the app.
 */
import type { ReactNode } from 'react';
import {
  useForm,
  type Control,
  type Resolver,
  type UseFormGetValues,
  type UseFormSetValue,
  type UseFormTrigger,
  type UseFormWatch,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productListingSchema } from '../list-products.schema';
import { emptyValues } from '../list-products.map';
import type { ProductListingValues } from '../list-products.types';

export interface ProductFormApi {
  control: Control<ProductListingValues>;
  watch: UseFormWatch<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  getValues: UseFormGetValues<ProductListingValues>;
  trigger: UseFormTrigger<ProductListingValues>;
}

interface HarnessProps {
  defaultValues?: Partial<ProductListingValues>;
  apiRef?: { current: ProductFormApi | null };
  renderFields: (api: ProductFormApi) => ReactNode;
}

export function ProductFormHarness({ defaultValues, apiRef, renderFields }: Readonly<HarnessProps>) {
  const form = useForm<ProductListingValues, unknown, ProductListingValues>({
    resolver: zodResolver(productListingSchema) as unknown as Resolver<ProductListingValues, unknown, ProductListingValues>,
    defaultValues: { ...emptyValues, ...defaultValues },
    mode: 'onBlur',
  });
  const api: ProductFormApi = {
    control: form.control,
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
    trigger: form.trigger,
  };
  if (apiRef) {
    apiRef.current = api;
  }
  return <>{renderFields(api)}</>;
}
