import { useCallback } from 'react';
import type { Control } from 'react-hook-form';
import { RhfAdminCategory } from '@duncit/category';
import { OCCURRENCES } from '@duncit/pod-form';
import { MediaListField } from '@duncit/media-picker';
import {
  AutoPodForm,
  type AutoPodFormValues,
  type AutoPodMediaFieldProps,
} from '@duncit/auto-pods';

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

  const renderMediaField = useCallback(
    ({ value, onChange, label, helperText, error, folder }: Readonly<AutoPodMediaFieldProps>) => (
      <MediaListField
        label={label}
        value={value}
        onChange={onChange}
        folder={folder}
        helperText={error ?? helperText}
      />
    ),
    []
  );

  return (
    <AutoPodForm
      {...rest}
      t={t}
      occurrences={OCCURRENCES}
      renderCategory={renderCategory}
      renderMediaField={renderMediaField}
      hint={t('admin.autoPods.noVenueHostHint')}
    />
  );
}
