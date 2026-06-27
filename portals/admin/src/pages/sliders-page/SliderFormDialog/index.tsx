import type { SetStateAction } from 'react';
import { useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AiFillButton from '../../../components/AiFillButton';
import type { SliderForm } from '../queries';
import { sliderFormSchema } from '../slider.form';
import SliderSections from './SliderSections';

interface Props {
  open: boolean;
  onClose: () => void;
  form: SliderForm;
  busy: boolean;
  opError: string | null;
  onSubmit: (values: SliderForm) => void;
  locations: any[];
  superCategories: { id: string; name: string; slug: string }[];
}

export default function SliderFormDialog({
  open,
  onClose,
  form,
  busy,
  opError,
  onSubmit,
  locations,
  superCategories,
}: Readonly<Props>) {
  const { watch, reset, trigger, handleSubmit, formState } = useForm<SliderForm>({
    defaultValues: form,
    resolver: zodResolver(sliderFormSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    reset(form);
  }, [form, reset]);

  const values = watch();

  const setForm = (next: SetStateAction<SliderForm>) => {
    const resolved = typeof next === 'function' ? (next as (prev: SliderForm) => SliderForm)(values) : next;
    reset(resolved, { keepSubmitCount: true, keepDefaultValues: true });
    void trigger();
  };

  const submit = handleSubmit((accepted) => onSubmit(accepted));

  const applyAiFill = (data: any) =>
    setForm({
      ...values,
      title: data.title ?? values.title,
      description: data.description ?? values.description,
      media_url: data.media_url ?? values.media_url,
      media_type: data.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      link_url: data.link_url ?? values.link_url,
      sort_order: Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : values.sort_order,
    });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{values.id ? 'Edit Slider' : 'New Slider'}</span>
          <AiFillButton entity="SLIDER" onFill={applyAiFill} />
        </DialogTitle>
        <DialogContent>
          <SliderSections
            values={values}
            errors={formState.errors}
            submitCount={formState.submitCount}
            setForm={setForm}
            locations={locations}
            superCategories={superCategories}
            opError={opError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="contained" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
