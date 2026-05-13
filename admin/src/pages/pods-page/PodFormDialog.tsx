import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { Formik, Form } from 'formik';
import { useState } from 'react';
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
  onSubmit: (values: PodForm) => Promise<void> | void;
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
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['basic']));
  const isEdit = !!initialValues.id;
  const toggleOne = (id: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(SECTION_IDS));
  const collapseAll = () => setExpanded(new Set());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Formik<PodForm>
        initialValues={initialValues}
        enableReinitialize
        validationSchema={podFormSchema}
        validateOnBlur
        onSubmit={async (values) => onSubmit(values)}
      >
        {(formik) => (
          <Form noValidate>
            <CascadeEffect
              clubs={clubs}
              venues={venues}
            />
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
                  applyAiFillToForm(d, formik.values, formik.setValues)
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
              <Button
                variant="contained"
                type="submit"
                disabled={busy || formik.isSubmitting}
              >
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
