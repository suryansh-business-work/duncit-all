import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import AiFillButton from '../../components/AiFillButton';
import CascadeEffect from './pod-form/CascadeEffect';
import PodFormSections, { SECTION_IDS } from './pod-form/PodFormSections';
import { podFormSchema } from './pod-form/schema';
import { applyAiFillToForm } from './podFormAi';
import type { PodForm } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  initialValues: PodForm;
  busy: boolean;
  opError: string | null;
  clubs: any[];
  venues: any[];
  inventoryProducts: any[];
  users: any[];
  userName: (id: string) => string;
  onSubmit: (values: PodForm, options?: { draft?: boolean }) => Promise<void> | void;
  finance?: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
}

export default function PodFormDialog({
  open,
  onClose,
  initialValues,
  busy,
  opError,
  clubs,
  venues,
  inventoryProducts,
  users,
  userName,
  onSubmit,
  finance,
}: Readonly<Props>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['basic']));
  const submitMode = useRef<'publish' | 'draft'>('publish');
  const isEdit = !!initialValues.id;
  const methods = useForm<PodForm>({
    resolver: zodResolver(podFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    methods.reset(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const toggleOne = (id: string, openSection: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (openSection) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(SECTION_IDS));
  const collapseAll = () => setExpanded(new Set());

  const submit = methods.handleSubmit(async (values) => {
    const draft = submitMode.current === 'draft';
    submitMode.current = 'publish';
    await onSubmit(values, { draft });
  });
  const busyOrSubmitting = busy || methods.formState.isSubmitting;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <FormProvider {...methods}>
        <form noValidate onSubmit={submit}>
          <CascadeEffect clubs={clubs} venues={venues} />
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <span>{isEdit ? 'Edit Pod' : 'New Pod'}</span>
            <AiFillButton
              entity="POD"
              onFill={(d: any) =>
                applyAiFillToForm(d, methods.getValues(), (next) => methods.reset(next))
              }
            />
          </DialogTitle>
          <DialogContent dividers>
            <PodFormSections
              expanded={expanded}
              onToggle={toggleOne}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              clubs={clubs}
              venues={venues}
              inventoryProducts={inventoryProducts}
              users={users}
              userName={userName}
              finance={finance}
            />
            {opError && <Alert severity="error" sx={{ mt: 2 }}>{opError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            {!isEdit && (
              <Button
                variant="outlined"
                type="button"
                disabled={busyOrSubmitting}
                onClick={() => {
                  submitMode.current = 'draft';
                  void submit();
                }}
              >
                Save as Draft
              </Button>
            )}
            <Button
              variant="contained"
              type="submit"
              disabled={busyOrSubmitting}
              onClick={() => {
                submitMode.current = 'publish';
              }}
            >
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
}
