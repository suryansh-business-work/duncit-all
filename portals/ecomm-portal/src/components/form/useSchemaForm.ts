import { useMemo } from 'react';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { useTranslation } from '@duncit/shell';
import type { Translate } from '../../lib/translate';

/**
 * React Hook Form over a Zod schema built for the reader's language. Every
 * form in this console starts here, so they all validate on touch the same way.
 */
export function useSchemaForm<V extends FieldValues>(
  makeSchema: (t: Translate) => z.ZodType<V, V>,
  defaultValues: DefaultValues<V>,
) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeSchema(t), [makeSchema, t]);
  const form = useForm<V>({ resolver: zodResolver(schema), defaultValues, mode: 'onTouched' });
  return { t, form };
}
