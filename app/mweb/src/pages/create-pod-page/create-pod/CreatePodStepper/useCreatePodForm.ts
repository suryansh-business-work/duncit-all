import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Translate } from '../../../../i18n/fallback';
import { useCreatePodSchema } from '../useCreatePodSchema';
import type { CreatePodFormValues, CreatePodVenue } from '../create-pod.types';

/** The stepper's React Hook Form instance, validated by the reader's schema
 * (the venues let it hold an offer to the picked venue's business amount). */
export function useCreatePodForm(t: Translate, initialValues: CreatePodFormValues, venues: readonly CreatePodVenue[]) {
  const schema = useCreatePodSchema(t, venues);
  // The schema coerces a few fields (a spot count arrives from the DOM as a
  // string), so its INPUT type differs from CreatePodFormValues. The fields are
  // the values type — every step component is typed on it — so the resolver is
  // told that rather than the form being retyped around the coercion.
  return useForm<CreatePodFormValues, any, CreatePodFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<
      CreatePodFormValues,
      any,
      CreatePodFormValues
    >,
    defaultValues: initialValues,
    mode: 'onTouched',
  });
}
