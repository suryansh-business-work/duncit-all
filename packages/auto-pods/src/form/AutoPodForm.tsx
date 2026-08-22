/**
 * The Auto Pod template form, shared by every console that can open one.
 *
 * Deliberately NOT `@duncit/pod-form`: that package's Zod schema hard-requires a
 * club, a venue, a host and a venue slot, and an Auto Pod has none of them when
 * it is written — the marketplace supplies them later. Its `OCCURRENCES` list is
 * passed IN rather than imported, so the occurrence wording cannot drift from
 * the ordinary pod form without this package taking on its whole dependency
 * tree; the category field is injected for the same reason (see auto-pod.types).
 */
import { useEffect, type ReactElement, type ReactNode } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import AutoPodFields, {
  type AutoPodMediaFieldProps,
  type AutoPodOccurrence,
} from './AutoPodFields';
import { parseHashtags, parseMediaLines, type AutoPodFormValues } from './auto-pod.types';

/** Mirrors the server's own template checks so a bad template never round-trips. */
export const autoPodSchema = z.object({
  pod_title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  category: z.object({
    super_id: z.string(),
    super_name: z.string(),
    category_id: z.string(),
    category_name: z.string(),
    sub_id: z.string().min(1, 'Sub category is required'),
    sub_name: z.string(),
  }),
  pod_description: z.string().trim().min(1, 'Description is required').max(4000),
  pod_info: z.string().trim().max(4000),
  media: z
    .string()
    .refine((value) => parseMediaLines(value).length > 0, 'At least one image URL is required'),
  pod_amount: z.coerce
    .number({ message: 'Ticket price is required' })
    .min(1, 'Ticket price must be between 1 and 1999')
    .max(1999, 'Ticket price must be between 1 and 1999'),
  no_of_spots: z.coerce
    .number({ message: 'Spots are required' })
    .int('Spots must be a whole number')
    .min(2, 'An Auto Pod needs at least 2 spots')
    .max(999, 'An Auto Pod cannot have more than 999 spots'),
  pod_occurrence: z.string().min(1, 'Occurrence is required'),
  pod_hashtag: z.string().trim().max(300),
  payment_terms: z.string().trim().max(2000),
});

/** Form values → `CreateAutoPodInput` (the update input is the same shape). */
export const toAutoPodInput = (values: AutoPodFormValues) => {
  const cast = autoPodSchema.parse(values);
  return {
    pod_title: cast.pod_title,
    pod_description: cast.pod_description,
    sub_category_id: cast.category.sub_id,
    pod_amount: cast.pod_amount,
    no_of_spots: cast.no_of_spots,
    pod_images_and_videos: parseMediaLines(cast.media),
    pod_info: cast.pod_info,
    pod_hashtag: parseHashtags(cast.pod_hashtag),
    pod_occurrence: cast.pod_occurrence,
    payment_terms: cast.payment_terms || null,
  };
};

export interface AutoPodFormProps {
  open: boolean;
  initialValues: AutoPodFormValues;
  saving: boolean;
  error: string | null;
  t: (key: string) => string;
  /** "Cancel" for the dialog's dismiss button, from shellAutoPodLabels. */
  dismissLabel: string;
  occurrences: readonly AutoPodOccurrence[];
  /** The surface's own upload field — the picker writes the image paths. */
  renderMediaField: (props: Readonly<AutoPodMediaFieldProps>) => ReactElement;
  /** The surface's own category field — it needs the form's control. */
  renderCategory: (control: Control<AutoPodFormValues>) => ReactNode;
  /** What this author does NOT pick, in their own words. */
  hint: string;
  onClose: () => void;
  onSubmit: (values: AutoPodFormValues) => Promise<void>;
}

export default function AutoPodForm({
  open,
  initialValues,
  saving,
  error,
  t,
  dismissLabel,
  occurrences,
  renderCategory,
  renderMediaField,
  hint,
  onClose,
  onSubmit,
}: Readonly<AutoPodFormProps>) {
  const { control, handleSubmit, reset } = useForm<AutoPodFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(autoPodSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('admin.autoPods.formTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <AutoPodFields
            control={control}
            t={t}
            occurrences={occurrences}
            categoryField={renderCategory(control)}
            renderMediaField={renderMediaField}
            hint={hint}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{dismissLabel}</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? t('admin.autoPods.saving') : t('admin.autoPods.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
