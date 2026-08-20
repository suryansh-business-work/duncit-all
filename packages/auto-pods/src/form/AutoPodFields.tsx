import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { RhfTextField } from '@duncit/forms';
import type { AutoPodFormValues } from './auto-pod.types';

/** One occurrence choice — the caller passes `OCCURRENCES` from `@duncit/pod-form`
 * so the wording can never drift from the ordinary pod form. */
export interface AutoPodOccurrence {
  value: string;
  label: string;
}

export interface AutoPodFieldsProps {
  control: Control<AutoPodFormValues>;
  t: (key: string) => string;
  occurrences: readonly AutoPodOccurrence[];
  /** What replaces the category picker — the Admin cascade, or a club's fixed one. */
  categoryField: ReactNode;
  /** The line above the fields explaining what the author does NOT pick. */
  hint: string;
}

/**
 * Every input of the Auto Pod template, hoisted out of the dialog so neither
 * file grows past the 200-line ceiling (CLAUDE.md rule 9) and so the dialog
 * reads as chrome + actions only.
 */
export default function AutoPodFields({
  control,
  t,
  occurrences,
  categoryField,
  hint,
}: Readonly<AutoPodFieldsProps>) {
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Alert severity="info">{hint}</Alert>
      <RhfTextField control={control} name="pod_title" label={t('admin.autoPods.fieldTitle')} required />
      {categoryField}
      <RhfTextField
        control={control}
        name="pod_description"
        label={t('admin.autoPods.fieldDescription')}
        multiline
        minRows={3}
        required
      />
      <RhfTextField
        control={control}
        name="pod_info"
        label={t('admin.autoPods.fieldInfo')}
        multiline
        minRows={2}
      />
      <RhfTextField
        control={control}
        name="media"
        label={t('admin.autoPods.fieldMedia')}
        hint={t('admin.autoPods.fieldMediaHint')}
        multiline
        minRows={2}
        required
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="pod_amount"
          label={t('admin.autoPods.fieldPrice')}
          hint={t('admin.autoPods.fieldPriceHint')}
          type="number"
          required
        />
        <RhfTextField
          control={control}
          name="no_of_spots"
          label={t('admin.autoPods.fieldSpots')}
          hint={t('admin.autoPods.fieldSpotsHint')}
          type="number"
          required
        />
      </Stack>
      <RhfTextField
        control={control}
        name="pod_occurrence"
        label={t('admin.autoPods.fieldOccurrence')}
        select
      >
        {occurrences.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField control={control} name="pod_hashtag" label={t('admin.autoPods.fieldHashtags')} />
      <RhfTextField
        control={control}
        name="payment_terms"
        label={t('admin.autoPods.fieldPaymentTerms')}
        multiline
        minRows={2}
      />
    </Stack>
  );
}
