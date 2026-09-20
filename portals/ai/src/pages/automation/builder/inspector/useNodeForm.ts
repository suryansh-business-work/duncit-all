import { useEffect, useRef } from 'react';
import { useForm, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

/**
 * A step's settings form: react-hook-form + Zod, pushing every edit straight
 * into the graph.
 *
 * There is no Save button on a step — the flow has one — so the form writes
 * through as the operator types, valid or not (a draft may be incomplete), and
 * the Zod messages stay under the fields as guidance. Two guards keep the
 * write-through honest: the form is only reset when a DIFFERENT step is
 * selected, so the caret never jumps mid-word, and a reset does not count as an
 * edit, so opening a step does not mark the flow unsaved.
 */
export function useNodeForm<T extends FieldValues>(
  nodeId: string,
  schema: ZodType<T, any, any>,
  values: T,
  onChange: (values: T) => void
) {
  const form = useForm<T, any, T>({
    defaultValues: values as DefaultValues<T>,
    resolver: zodResolver(schema) as unknown as Resolver<T, any, T>,
    mode: 'onChange',
  });
  const { reset, watch } = form;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    reset(valuesRef.current);
  }, [nodeId, reset]);

  useEffect(() => {
    const subscription = watch((value, info) => {
      // `name` is set on a user edit and absent on a programmatic reset.
      if (!info.name) return;
      onChangeRef.current(value as T);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return form;
}
