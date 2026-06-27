import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, DialogActions, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { partnerPodSchema } from './partner-pod.schema';
import { AboutFields, BasicFields, PaymentFields, PlaceFields, ProductsFields } from './partner-pod.sections';
import type { PartnerPodFormValues } from './partner-pod.types';

export { partnerPodSchema } from './partner-pod.schema';
export { buildPartnerPodInput } from './partner-pod.input';

interface Props {
  initialValues: PartnerPodFormValues;
  clubs: any[];
  venues: any[];
  products: any[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: PartnerPodFormValues, options?: { draft?: boolean }) => Promise<void> | void;
}

export default function PartnerPodForm({ initialValues, clubs, venues, products, busy, onCancel, onSubmit }: Readonly<Props>) {
  const [expanded, setExpanded] = useState('basic');
  const submitMode = useRef<'publish' | 'draft'>('publish');
  const methods = useForm<PartnerPodFormValues>({
    resolver: zodResolver(partnerPodSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    methods.reset(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const submit = methods.handleSubmit((values) => onSubmit(values, { draft: submitMode.current === 'draft' }));
  const podMode = methods.watch('pod_mode');
  const busyOrSubmitting = busy || methods.formState.isSubmitting;

  return (
    <FormProvider {...methods}>
      <form noValidate onSubmit={submit}>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Alert severity="info">Your approved host profile is added as the pod host automatically.</Alert>
          <PodSection id="basic" title="1. Basic Information" expanded={expanded} setExpanded={setExpanded}><BasicFields clubs={clubs} /></PodSection>
          <PodSection id="place" title={podMode === 'VIRTUAL' ? '2. Meeting Details' : '2. When, Where & Map'} expanded={expanded} setExpanded={setExpanded}><PlaceFields clubs={clubs} venues={venues} /></PodSection>
          <PodSection id="about" title="3. About this Pod" expanded={expanded} setExpanded={setExpanded}><AboutFields /></PodSection>
          <PodSection id="products" title="4. Approved Products" expanded={expanded} setExpanded={setExpanded}><ProductsFields products={products} /></PodSection>
          <PodSection id="payment" title="5. Payment & Charges" expanded={expanded} setExpanded={setExpanded}><PaymentFields /></PodSection>
        </Stack>
        <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="outlined" type="button" disabled={busyOrSubmitting} onClick={() => { submitMode.current = 'draft'; void submit(); }}>Save as Draft</Button>
          <Button variant="contained" type="submit" disabled={busyOrSubmitting} onClick={() => { submitMode.current = 'publish'; }}>{busy ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </form>
    </FormProvider>
  );
}

interface SectionProps {
  id: string;
  title: string;
  expanded: string;
  setExpanded: (id: string) => void;
  children: React.ReactNode;
}

function PodSection({ id, title, expanded, setExpanded, children }: Readonly<SectionProps>) {
  return (
    <Accordion expanded={expanded === id} onChange={(_, open) => open && setExpanded(id)} disableGutters sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={900}>{title}</Typography></AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
