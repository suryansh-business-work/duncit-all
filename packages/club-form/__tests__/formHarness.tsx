import { useEffect, type ReactNode } from 'react';
import { FormProvider, useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import type { ClubFormValues } from '../src/types';
import { blankClubFormValues } from '../src/types';

interface HarnessProps {
  defaultValues?: Partial<ClubFormValues>;
  resolver?: Resolver<ClubFormValues>;
  onMethods?: (methods: UseFormReturn<ClubFormValues>) => void;
  children: ReactNode;
}

/** Wraps children in a real RHF FormProvider and hands the methods back so a
 * test can drive setValue/setError/getValues directly. */
export function FormHarness({ defaultValues, resolver, onMethods, children }: Readonly<HarnessProps>) {
  const methods = useForm<ClubFormValues>({
    defaultValues: { ...blankClubFormValues, ...defaultValues },
    resolver,
  });
  useEffect(() => {
    onMethods?.(methods);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods]);
  return <FormProvider {...methods}>{children}</FormProvider>;
}
