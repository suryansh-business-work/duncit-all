import { useEffect, useRef } from 'react';
import { useForm, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/**
 * A form that edits a timeline item as it is typed into — the inspector has no
 * Save button; every valid change lands on the reel at once.
 *
 * `values` is the item as it stands now, in the form's own units. When it
 * changes for a reason other than this form (a drag on the timeline, undo, a
 * chat reply), the form is reset to it; the form's own echo is recognised and
 * ignored, so a field being typed into is never reset under the cursor.
 */
export function useLiveForm<T extends FieldValues>(
  schema: z.ZodType<T>,
  values: T,
  onChange: (values: T) => void
) {
  const form = useForm<T, unknown, T>({
    defaultValues: values as DefaultValues<T>,
    resolver: zodResolver(schema as Parameters<typeof zodResolver>[0]) as unknown as Resolver<T, unknown, T>,
    mode: 'onChange',
  });
  const { reset, watch } = form;
  const incoming = JSON.stringify(values);
  const echoed = useRef(incoming);
  const latest = useRef({ values, onChange });
  latest.current = { values, onChange };

  useEffect(() => {
    if (incoming === echoed.current) return;
    echoed.current = incoming;
    reset(latest.current.values);
  }, [incoming, reset]);

  useEffect(() => {
    const subscription = watch((raw) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return;
      const key = JSON.stringify(parsed.data);
      if (key === echoed.current) return;
      echoed.current = key;
      latest.current.onChange(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [schema, watch]);

  return form;
}
