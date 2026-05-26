import { useRef, useState } from 'react';
import * as yup from 'yup';
import { Form, Formik, useFormikContext } from 'formik';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, DialogActions, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import PartnerPodProductsField from './PartnerPodProductsField';
import VenueSlotPicker from './VenueSlotPicker';
import { OCCURRENCES, POD_TYPES, type PartnerPodFormValues } from './partner-pod.types';

export const partnerPodSchema = yup.object({
  pod_title: yup.string().trim().min(3, 'Title is too short').max(120).required('Title required'),
  club_id: yup.string().required('Select a club'),
  venue_id: yup.string().when('pod_mode', { is: 'PHYSICAL', then: (schema) => schema.required('Select a venue'), otherwise: (schema) => schema.default('') }),
  venue_slot_id: yup.string().when(['pod_mode', 'venue_id'], { is: (mode: string, venueId: string) => mode === 'PHYSICAL' && !!venueId, then: (schema) => schema.required('Pick an available slot'), otherwise: (schema) => schema.default('') }),
  pod_mode: yup.mixed<'PHYSICAL' | 'VIRTUAL'>().oneOf(['PHYSICAL', 'VIRTUAL']).required(),
  meeting_platform: yup.string().trim().max(80).default(''),
  meeting_url: yup.string().trim().when('pod_mode', { is: 'VIRTUAL', then: (schema) => schema.required('Meeting link is required').url('Meeting link must be valid'), otherwise: (schema) => schema.default('') }),
  meeting_notes: yup.string().trim().max(1000).default(''),
  pod_description: yup.string().trim().min(10, 'Add a longer description').required('Description required'),
  pod_date_time: yup.date().nullable().required('Start date/time required').test('future-start', 'Start date/time must be after current date/time', (value) => !!value && value.getTime() > Date.now()),
  pod_end_date_time: yup.date().nullable().test('after-start', 'End must be after start', function (value) { const start = (this.parent as PartnerPodFormValues).pod_date_time; return !value || !start || value.getTime() > start.getTime(); }),
  pod_type: yup.string().required(),
  pod_amount: yup.number().typeError('Amount must be a number').min(0).max(1999).required().test('free-zero', 'Free pods must have amount 0', function (value) { return !String((this.parent as PartnerPodFormValues).pod_type).includes('FREE') || value === 0; }),
  pod_occurrence: yup.string().required(),
  no_of_spots: yup.number().typeError('Spots must be a number').min(0).max(10000).required(),
  pod_info: yup.string().max(2000).default(''),
  pod_hashtag_text: yup.string().max(500).default(''),
  media_text: yup.string().default(''),
  payment_terms: yup.string().max(4000).default(''),
  what_this_pod_offers_text: yup.string().max(1000).default(''),
  available_perks_text: yup.string().max(1000).default(''),
  products_enabled: yup.boolean().default(false),
  product_requests: yup.array(yup.object({ product_id: yup.string().required('Select product'), quantity: yup.number().typeError('Quantity required').min(1).max(10000).required() })).default([]).when('products_enabled', { is: true, then: (schema) => schema.min(1, 'Select at least one approved product'), otherwise: (schema) => schema.max(0) }),
});

interface Props { initialValues: PartnerPodFormValues; clubs: any[]; venues: any[]; products: any[]; busy: boolean; onCancel: () => void; onSubmit: (values: PartnerPodFormValues, options?: { draft?: boolean }) => Promise<void> | void; }

export default function PartnerPodForm({ initialValues, clubs, venues, products, busy, onCancel, onSubmit }: Props) {
  const [expanded, setExpanded] = useState('basic');
  const submitMode = useRef<'publish' | 'draft'>('publish');
  return (
    <Formik initialValues={initialValues} validationSchema={partnerPodSchema} enableReinitialize onSubmit={(values) => onSubmit(values, { draft: submitMode.current === 'draft' })}>
      {(formik) => <Form noValidate>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Alert severity="info">Your approved host profile is added as the pod host automatically.</Alert>
          <PodSection id="basic" title="1. Basic Information" expanded={expanded} setExpanded={setExpanded}><BasicFields clubs={clubs} /></PodSection>
          <PodSection id="place" title={formik.values.pod_mode === 'VIRTUAL' ? '2. Meeting Details' : '2. When, Where & Map'} expanded={expanded} setExpanded={setExpanded}><PlaceFields clubs={clubs} venues={venues} /></PodSection>
          <PodSection id="about" title="3. About this Pod" expanded={expanded} setExpanded={setExpanded}><AboutFields /></PodSection>
          <PodSection id="products" title="4. Approved Products" expanded={expanded} setExpanded={setExpanded}><ProductsFields products={products} /></PodSection>
          <PodSection id="payment" title="5. Payment & Charges" expanded={expanded} setExpanded={setExpanded}><PaymentFields /></PodSection>
        </Stack>
        <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="outlined" type="button" disabled={busy || formik.isSubmitting} onClick={() => { submitMode.current = 'draft'; formik.submitForm(); }}>Save as Draft</Button>
          <Button variant="contained" type="submit" disabled={busy || formik.isSubmitting} onClick={() => { submitMode.current = 'publish'; }}>{busy ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Form>}
    </Formik>
  );
}

function PodSection({ id, title, expanded, setExpanded, children }: { id: string; title: string; expanded: string; setExpanded: (id: string) => void; children: React.ReactNode }) {
  return <Accordion expanded={expanded === id} onChange={(_, open) => open && setExpanded(id)} disableGutters sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, '&:before': { display: 'none' } }}><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={900}>{title}</Typography></AccordionSummary><AccordionDetails>{children}</AccordionDetails></Accordion>;
}

function BasicFields({ clubs }: { clubs: any[] }) {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PartnerPodFormValues>();
  return <Stack spacing={2}><TextField label="Pod title" name="pod_title" value={values.pod_title} onChange={handleChange} required fullWidth error={!!touched.pod_title && !!errors.pod_title} helperText={touched.pod_title ? errors.pod_title : 'A URL-friendly slug is generated from this title'} /><ToggleButtonGroup exclusive fullWidth color="primary" value={values.pod_mode} onChange={(_, mode) => mode && setFieldValue('pod_mode', mode)}><ToggleButton value="PHYSICAL"><PlaceIcon fontSize="small" sx={{ mr: 1 }} /> Physical</ToggleButton><ToggleButton value="VIRTUAL"><VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Virtual</ToggleButton></ToggleButtonGroup><TextField select label="Club" value={values.club_id} onChange={(event) => { setFieldValue('club_id', event.target.value); setFieldValue('venue_id', ''); }} required fullWidth error={!!touched.club_id && !!errors.club_id} helperText={touched.club_id ? errors.club_id : undefined}>{clubs.map((club) => <MenuItem key={club.id} value={club.id}>{club.club_name}</MenuItem>)}</TextField><TextField label="Hashtags" name="pod_hashtag_text" value={values.pod_hashtag_text} onChange={handleChange} fullWidth placeholder="#weekend #community" /><TextField label="Media URLs" name="media_text" value={values.media_text} onChange={handleChange} fullWidth multiline minRows={2} helperText="One image or video URL per line." /></Stack>;
}

function PlaceFields({ clubs, venues }: { clubs: any[]; venues: any[] }) {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PartnerPodFormValues>();
  const linkedVenueIds = new Set(clubs.find((club) => club.id === values.club_id)?.meetup_venues_id ?? []);
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));

  const handleVenueChange = (nextVenueId: string) => {
    setFieldValue('venue_id', nextVenueId);
    setFieldValue('venue_slot_id', '');
    setFieldValue('pod_date_time', null);
    setFieldValue('pod_end_date_time', null);
  };

  const handleSlotPick = (slot: { id: string; start_at: string; end_at: string } | null) => {
    if (!slot) {
      setFieldValue('venue_slot_id', '');
      setFieldValue('pod_date_time', null);
      setFieldValue('pod_end_date_time', null);
      return;
    }
    setFieldValue('venue_slot_id', slot.id);
    setFieldValue('pod_date_time', new Date(slot.start_at));
    setFieldValue('pod_end_date_time', new Date(slot.end_at));
  };

  return (
    <Stack spacing={2}>
      {values.pod_mode === 'PHYSICAL' ? (
        <>
          <TextField
            select
            label="Venue"
            value={values.venue_id}
            onChange={(event) => handleVenueChange(event.target.value)}
            required
            fullWidth
            disabled={!values.club_id}
            error={!!touched.venue_id && !!errors.venue_id}
            helperText={
              touched.venue_id
                ? errors.venue_id
                : clubVenues.length === 0
                  ? 'No approved venues linked to this club.'
                  : 'Only your approved venues linked with this club are shown.'
            }
          >
            {clubVenues.map((venue) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.venue_name} - {[venue.locality, venue.city].filter(Boolean).join(', ')}
              </MenuItem>
            ))}
          </TextField>
          <VenueSlotPicker
            venueId={values.venue_id}
            selectedSlotId={values.venue_slot_id}
            onSelect={handleSlotPick}
          />
          {touched.venue_slot_id && errors.venue_slot_id && (
            <Alert severity="error">{String(errors.venue_slot_id)}</Alert>
          )}
        </>
      ) : (
        <>
          <TextField label="Meeting platform" name="meeting_platform" value={values.meeting_platform} onChange={handleChange} fullWidth />
          <TextField label="Meeting link" name="meeting_url" value={values.meeting_url} onChange={handleChange} required fullWidth error={!!touched.meeting_url && !!errors.meeting_url} helperText={touched.meeting_url ? errors.meeting_url : undefined} />
          <TextField label="Meeting notes" name="meeting_notes" value={values.meeting_notes} onChange={handleChange} fullWidth multiline minRows={2} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DateTimePicker
              label="Start date & time"
              value={values.pod_date_time}
              onChange={(date) => setFieldValue('pod_date_time', date)}
              minDateTime={new Date()}
              slotProps={{ textField: { fullWidth: true, required: true, error: !!touched.pod_date_time && !!errors.pod_date_time, helperText: touched.pod_date_time ? String(errors.pod_date_time || '') : undefined } }}
            />
            <DateTimePicker
              label="End date & time"
              value={values.pod_end_date_time}
              onChange={(date) => setFieldValue('pod_end_date_time', date)}
              minDateTime={values.pod_date_time || new Date()}
              slotProps={{ textField: { fullWidth: true, error: !!touched.pod_end_date_time && !!errors.pod_end_date_time, helperText: touched.pod_end_date_time ? String(errors.pod_end_date_time || '') : undefined } }}
            />
          </Stack>
        </>
      )}
    </Stack>
  );
}

function AboutFields() {
  const { values, errors, touched, handleChange } = useFormikContext<PartnerPodFormValues>();
  return <Stack spacing={2}><TextField label="Description" name="pod_description" value={values.pod_description} onChange={handleChange} required fullWidth multiline minRows={4} error={!!touched.pod_description && !!errors.pod_description} helperText={touched.pod_description ? errors.pod_description : undefined} /><TextField label="Pod info" name="pod_info" value={values.pod_info} onChange={handleChange} fullWidth multiline minRows={2} /><TextField label="What this pod offers" name="what_this_pod_offers_text" value={values.what_this_pod_offers_text} onChange={handleChange} fullWidth multiline minRows={2} helperText="One offer per line." /><TextField label="Available perks" name="available_perks_text" value={values.available_perks_text} onChange={handleChange} fullWidth multiline minRows={2} helperText="One perk per line." /></Stack>;
}

function ProductsFields({ products }: { products: any[] }) {
  const { values, setFieldValue } = useFormikContext<PartnerPodFormValues>();
  return <Stack spacing={2}><Stack direction="row" alignItems="center" spacing={1}><Switch checked={values.products_enabled} onChange={(event) => { setFieldValue('products_enabled', event.target.checked); if (!event.target.checked) setFieldValue('product_requests', []); }} /><Typography fontWeight={900}>Enable approved products</Typography></Stack>{values.products_enabled && <PartnerPodProductsField products={products} />}</Stack>;
}

function PaymentFields() {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PartnerPodFormValues>();
  const isFree = values.pod_type.includes('FREE');
  return <Stack spacing={2}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select label="Pod type" value={values.pod_type} onChange={(event) => { setFieldValue('pod_type', event.target.value); if (event.target.value.includes('FREE')) setFieldValue('pod_amount', 0); }} fullWidth>{POD_TYPES.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}</TextField><TextField select label="Occurrence" name="pod_occurrence" value={values.pod_occurrence} onChange={handleChange} fullWidth>{OCCURRENCES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Amount" type="number" value={values.pod_amount} onChange={(event) => setFieldValue('pod_amount', Number(event.target.value) || 0)} disabled={isFree} fullWidth error={!!touched.pod_amount && !!errors.pod_amount} helperText={touched.pod_amount ? errors.pod_amount : isFree ? 'Free pod amount must be 0.' : 'Gross price, max 1999.'} /><TextField label="No. of spots" type="number" value={values.no_of_spots} onChange={(event) => setFieldValue('no_of_spots', Number(event.target.value) || 0)} fullWidth error={!!touched.no_of_spots && !!errors.no_of_spots} helperText={touched.no_of_spots ? errors.no_of_spots : undefined} /></Stack><TextField label="Payment terms" name="payment_terms" value={values.payment_terms} onChange={handleChange} fullWidth multiline minRows={3} /></Stack>;
}

export function buildPartnerPodInput(values: PartnerPodFormValues, draft?: boolean) {
  const lines = (text: string) => text.split('\n').map((item) => item.trim()).filter(Boolean);
  return { pod_title: values.pod_title.trim(), club_id: values.club_id, pod_mode: values.pod_mode, venue_id: values.pod_mode === 'PHYSICAL' ? values.venue_id : null, venue_slot_id: values.pod_mode === 'PHYSICAL' ? values.venue_slot_id || null : null, location_id: null, zone_name: null, meeting_platform: values.pod_mode === 'VIRTUAL' ? values.meeting_platform.trim() || null : null, meeting_url: values.pod_mode === 'VIRTUAL' ? values.meeting_url.trim() : null, meeting_notes: values.pod_mode === 'VIRTUAL' ? values.meeting_notes.trim() || null : null, pod_hosts_id: [], pod_description: values.pod_description, pod_date_time: values.pod_date_time?.toISOString(), pod_end_date_time: values.pod_end_date_time?.toISOString() ?? null, pod_type: values.pod_type, pod_amount: Number(values.pod_amount) || 0, pod_occurrence: values.pod_occurrence, no_of_spots: Number(values.no_of_spots) || 0, pod_info: values.pod_info, pod_hashtag: values.pod_hashtag_text.split(/[\s,]+/).map((item) => item.replace(/^#/, '').trim()).filter(Boolean), pod_images_and_videos: lines(values.media_text).map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' })), payment_terms: values.payment_terms || null, what_this_pod_offers: lines(values.what_this_pod_offers_text), available_perks: lines(values.available_perks_text), place_charges: [], products_enabled: values.pod_mode === 'PHYSICAL' && values.products_enabled, product_requests: values.pod_mode === 'PHYSICAL' && values.products_enabled ? values.product_requests : [], is_active: !draft };
}