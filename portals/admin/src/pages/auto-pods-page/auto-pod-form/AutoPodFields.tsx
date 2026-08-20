import type { Control } from 'react-hook-form';
import { Alert, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { RhfAdminCategory } from '@duncit/category';
import { OCCURRENCES } from '@duncit/pod-form';
import type { AutoPodFormValues } from './auto-pod.types';

interface AutoPodFieldsProps {
  control: Control<AutoPodFormValues>;
  t: (key: string) => string;
}

/**
 * Every input of the Auto Pod template, hoisted out of the dialog so neither
 * file grows past the 200-line ceiling (CLAUDE.md rule 9) and so the dialog
 * reads as chrome + actions only.
 */
export default function AutoPodFields({ control, t }: Readonly<AutoPodFieldsProps>) {
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Alert severity="info">{t('admin.autoPods.noVenueHostHint')}</Alert>
      <RhfTextField control={control} name="pod_title" label={t('admin.autoPods.fieldTitle')} required />
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
        {OCCURRENCES.map((option) => (
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
