import { useCallback } from 'react';
import type { Control } from 'react-hook-form';
import { RhfAdminCategory } from '@duncit/category';
import { OCCURRENCES } from '@duncit/pod-form';
import { AutoPodForm, type AutoPodFormValues } from '@duncit/auto-pods';

interface Props {
  open: boolean;
  initialValues: AutoPodFormValues;
  saving: boolean;
  error: string | null;
  t: (key: string) => string;
  /** "Cancel" for the dialog's dismiss button, from shellAutoPodLabels. */
  dismissLabel: string;
  onClose: () => void;
  onSubmit: (values: AutoPodFormValues) => Promise<void>;
}

/**
 * The admin console's Auto Pod dialog: the shared template form with the full
 * Super → Sub category cascade, because a Duncit admin opens the offer to every
 * club in that category rather than to one club they run.
 */
export default function AdminAutoPodForm({ t, ...rest }: Readonly<Props>) {
  const renderCategory = useCallback(
    (control: Control<AutoPodFormValues>) => (
      <RhfAdminCategory
        control={control}
        name="category"
        fields={['super', 'sub']}
        required
        labels={{
          super: t('admin.autoPods.fieldSuperCategory'),
          sub: t('admin.autoPods.fieldSubCategory'),
        }}
      />
    ),
    [t]
  );

  return (
    <AutoPodForm
      {...rest}
      t={t}
      occurrences={OCCURRENCES}
      renderCategory={renderCategory}
      hint={t('admin.autoPods.noVenueHostHint')}
    />
  );
}
