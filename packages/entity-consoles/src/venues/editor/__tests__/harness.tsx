import type { ReactNode } from 'react';
import type { MockedResponse } from '@apollo/client/testing';
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { renderWithProviders } from '../../../../__tests__/testkit';

/**
 * Mounts one editor field or section inside a real React Hook Form, under the
 * providers every console screen boots with (mocked Apollo, the date/time
 * localization the MUI X pickers need, a router, the notify host).
 *
 * Returns a reader for the live form, so a test can assert what the field
 * WROTE after driving it like an admin would. Test harness, not shipped code.
 */
export function renderForm<T extends FieldValues>(
  defaults: DefaultValues<T>,
  body: (methods: UseFormReturn<T>) => ReactNode,
  mocks: MockedResponse[] = [],
) {
  const live: { methods: UseFormReturn<T> | null } = { methods: null };
  function Harness() {
    const methods = useForm<T>({ defaultValues: defaults });
    live.methods = methods;
    return <>{body(methods)}</>;
  }
  const view = renderWithProviders(<Harness />, { mocks });
  const form = (): UseFormReturn<T> => {
    if (!live.methods) throw new Error('The form harness has not rendered');
    return live.methods;
  };
  return { ...view, form };
}
