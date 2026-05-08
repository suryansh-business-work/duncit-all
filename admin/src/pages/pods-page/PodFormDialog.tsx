import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Formik, Form } from 'formik';
import { useState } from 'react';
import AiFillButton from '../../components/AiFillButton';
import BasicInfoSection from './pod-form/BasicInfoSection';
import MediaSection from './pod-form/MediaSection';
import WhenWhereSection from './pod-form/WhenWhereSection';
import AboutSection from './pod-form/AboutSection';
import OffersSection from './pod-form/OffersSection';
import PerksSection from './pod-form/PerksSection';
import PaymentChargesSection from './pod-form/PaymentChargesSection';
import CascadeEffect from './pod-form/CascadeEffect';
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
  filteredLocations: any[];
  zoneOptions: string[];
  users: any[];
  userName: (id: string) => string;
  onSubmit: (values: PodForm) => Promise<void> | void;
  finance?: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
}

const SECTIONS = [
  { id: 'basic', title: '1. Basic Information', body: 'BasicInfoSection' as const },
  { id: 'media', title: '2. Media Uploads', body: 'MediaSection' as const },
  { id: 'when', title: '3. When, Where & Map', body: 'WhenWhereSection' as const },
  { id: 'about', title: '4. About this Pod', body: 'AboutSection' as const },
  { id: 'offers', title: '5. What This Pod Offers', body: 'OffersSection' as const },
  { id: 'perks', title: '6. Available Perks', body: 'PerksSection' as const },
  { id: 'payment', title: '7. Payment & Place Charges', body: 'PaymentChargesSection' as const },
];

export default function PodFormDialog({
  open,
  onClose,
  initialValues,
  busy,
  opError,
  clubs,
  filteredLocations,
  zoneOptions,
  users,
  userName,
  onSubmit,
  finance,
}: Props) {
  const [expanded, setExpanded] = useState<string | false>('basic');
  const isEdit = !!initialValues.id;

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
              filteredLocations={filteredLocations}
              zoneOptions={zoneOptions}
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
              {SECTIONS.map((sec) => (
                <Accordion
                  key={sec.id}
                  expanded={expanded === sec.id}
                  onChange={(_, v) => setExpanded(v ? sec.id : false)}
                  disableGutters
                  square
                  sx={{
                    '&:before': { display: 'none' },
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    '&.Mui-expanded': { mb: 1.5 },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {sec.title}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {sec.body === 'BasicInfoSection' && (
                      <BasicInfoSection users={users} userName={userName} />
                    )}
                    {sec.body === 'MediaSection' && <MediaSection />}
                    {sec.body === 'WhenWhereSection' && (
                      <WhenWhereSection
                        clubs={clubs}
                        filteredLocations={filteredLocations}
                        zoneOptions={zoneOptions}
                      />
                    )}
                    {sec.body === 'AboutSection' && <AboutSection />}
                    {sec.body === 'OffersSection' && <OffersSection />}
                    {sec.body === 'PerksSection' && <PerksSection />}
                    {sec.body === 'PaymentChargesSection' && (
                      <PaymentChargesSection finance={finance} />
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
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
