import type { ReactNode } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { PodFormDataProvider } from '../../src/context';
import { blankPodFormValues, type PodFormConfig, type PodFormData, type PodFormValues } from '../../src/types';

/** Config with every flag off — spread overrides on top per test. */
export const makeConfig = (over: Partial<PodFormConfig> = {}): PodFormConfig => ({
  showHosts: false,
  showLocationZone: false,
  showVenueSlot: false,
  showPlaceCharges: false,
  showInventory: false,
  showFinance: false,
  showIsActive: false,
  showProducts: false,
  showReel: false,
  ...over,
});

/** Default injected PodFormData — override slices per test. */
export const makeData = (over: Partial<PodFormData> = {}): PodFormData => ({
  config: makeConfig(),
  clubs: [],
  venues: [],
  users: [],
  products: [],
  getClubVenueIds: () => [],
  ...over,
});

export interface HarnessProps {
  data?: PodFormData;
  defaultValues?: Partial<PodFormValues>;
  methodsRef?: { current: UseFormReturn<PodFormValues> | null };
  children: ReactNode;
}

/** Wraps children in an RHF FormProvider + PodFormDataProvider for section/field tests. */
export function Harness({ data, defaultValues, methodsRef, children }: Readonly<HarnessProps>) {
  const methods = useForm<PodFormValues>({
    defaultValues: { ...blankPodFormValues, ...defaultValues },
  });
  if (methodsRef) methodsRef.current = methods;
  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={data ?? makeData()}>{children}</PodFormDataProvider>
    </FormProvider>
  );
}
