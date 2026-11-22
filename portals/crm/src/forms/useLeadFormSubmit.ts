import { useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';

type SubmitAction<T> = (values: T) => Promise<void> | void;

/**
 * Submit handlers shared by the venue, host and ecomm lead forms.
 *
 * `handle` is the form's primary submit. `handleContinue` (only when the page
 * supports "& Continue") saves, then re-bases the form on the saved values so
 * the dirty state and old validation summary clear while the user keeps editing.
 * A failed save keeps every value and shows the server's message instead.
 */
export function useLeadFormSubmit<T extends FieldValues>(
  methods: UseFormReturn<T, unknown, T>,
  onSubmit: SubmitAction<T>,
  onSubmitAndContinue?: SubmitAction<T>,
) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [continuing, setContinuing] = useState(false);

  const run = (action: SubmitAction<T>, keepEditing: boolean) =>
    methods.handleSubmit(async (values) => {
      setStatus(undefined);
      setContinuing(keepEditing);
      try {
        await action(values);
        if (keepEditing) methods.reset(values);
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : t('crm.components.somethingWentWrong'));
      }
    });

  return {
    status,
    continuing,
    handle: run(onSubmit, false),
    handleContinue: onSubmitAndContinue ? run(onSubmitAndContinue, true) : undefined,
  };
}
