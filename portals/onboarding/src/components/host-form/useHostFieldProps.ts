import { useCallback } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { FieldPath, FieldValues } from 'react-hook-form';

type Name = FieldPath<FieldValues>;

const getNested = (source: unknown, name: Name) =>
  name.split('.').reduce<any>((acc, key) => acc?.[key], source);

/**
 * Replicates the old Formik `hasError` / `tfProps` helpers on react-hook-form so
 * every host-form field keeps identical behaviour: the validation error shows
 * once the form has been submitted, the field has been touched, or it already
 * holds a value. Otherwise a blank single-space helper keeps the layout stable.
 */
export function useHostFieldProps() {
  const { register } = useFormContext();
  const { errors, touchedFields, submitCount } = useFormState();
  const values = useWatch();

  const errorMessage = useCallback(
    (name: Name) => getNested(errors, name)?.message as string | undefined,
    [errors],
  );

  const hasError = useCallback(
    (name: Name) => {
      const value = getNested(values, name);
      const hasValue = Array.isArray(value) ? value.length > 0 : String(value ?? '').length > 0;
      const touched = getNested(touchedFields, name);
      return Boolean(getNested(errors, name) && (submitCount > 0 || touched || hasValue));
    },
    [errors, touchedFields, submitCount, values],
  );

  const tfProps = useCallback(
    (name: Name) => ({
      ...register(name),
      error: hasError(name),
      helperText: hasError(name) ? errorMessage(name) : ' ',
      fullWidth: true,
      size: 'small' as const,
    }),
    [register, hasError, errorMessage],
  );

  return { hasError, errorMessage, tfProps, errors, submitCount };
}
