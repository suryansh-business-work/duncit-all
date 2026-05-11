import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Step, StepLabel, Stepper, TextField } from '@mui/material';
import * as yup from 'yup';
import VenueDetailsSection from '../../components/admin-venue-create-dialog/VenueDetailsSection';
import VenueDocsSection from '../../components/admin-venue-create-dialog/VenueDocsSection';
import VenueOwnerSection from '../../components/admin-venue-create-dialog/VenueOwnerSection';
import { selectedLocation } from '../../components/admin-venue-create-dialog/VenueLocationFields';
import { LOCATIONS_FOR_VENUE, blankS1, blankS3, type DocEntry, type Step1, type Step3 } from '../../components/admin-venue-create-dialog/queries';
import { STATUSES, UPDATE_VENUE } from './queries';

interface Props {
  venue: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const steps = ['Venue', 'Documents', 'Owner'];
const schema = yup.object({
  step1: yup.object({
    venue_name: yup.string().trim().required('Venue name required'),
    venue_type: yup.string().trim().required('Venue type required'),
    capacity: yup.number().integer().min(1).required(),
    address_line1: yup.string().trim().required('Address required'),
    location_id: yup.string().trim().required('Select a city from locations'),
    country_code: yup.string().trim().required('Country required'),
    state: yup.string().trim().required('State required'),
    city: yup.string().trim().required('City required'),
    locality: yup.string().trim().required('Locality required'),
    postal_code: yup.string().trim().required('Postal code required'),
  }),
  step2: yup.object({ documents: yup.array().default([]), gstin: yup.string(), pan: yup.string() }),
  step3: yup.object({
    owner_name: yup.string().trim().required('Owner name required'),
    owner_email: yup.string().email().required('Owner email required'),
    owner_phone: yup.string().trim().required('Owner phone required'),
  }),
});

const dateOnly = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : '';

const hydrateLocation = (base: Step1, locations: any[]): Step1 => {
  const location = selectedLocation(locations, base);
  const zones = location?.location_zones ?? [];
  const zone = zones.find((item: any) => item.zone_name === base.locality || item.zone_code === base.locality);
  return {
    ...base,
    location_id: base.location_id || location?.id || '',
    country: location?.country || base.country,
    country_code: location?.country_code || base.country_code,
    state: location?.state || base.state,
    state_code: location?.state_code || base.state_code,
    city: location ? location.city || location.location_name : base.city,
    locality: zone?.zone_name || base.locality || (location && zones.length === 0 ? location.city || location.location_name : ''),
    postal_code: zone?.pincode || location?.location_pincode || base.postal_code,
  };
};

export default function VenueEditDialog({ venue, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [s1, setS1] = useState<Step1>(blankS1);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [s2, setS2] = useState({ gstin: '', pan: '' });
  const [s3, setS3] = useState<Step3>(blankS3);
  const [status, setStatus] = useState('APPROVED');
  const [error, setError] = useState('');
  const [updateVenue, state] = useMutation(UPDATE_VENUE);
  const { data: locationsData } = useQuery(LOCATIONS_FOR_VENUE, { skip: !venue });

  useEffect(() => {
    if (!venue) return;
    const locations = locationsData?.locations ?? [];
    setStep(0);
    const baseS1 = {
      venue_name: venue.venue_name ?? '', venue_type: venue.venue_type ?? 'Cafe', capacity: venue.capacity ?? 1,
      description: venue.description ?? '', cover_image_url: venue.cover_image_url ?? '', address_line1: venue.address_line1 ?? '',
      address_line2: venue.address_line2 ?? '', location_id: venue.location_id ?? '', country: venue.country ?? 'India', country_code: venue.country_code ?? 'IN',
      city: venue.city ?? '', state: venue.state ?? '', state_code: venue.state_code ?? '', locality: venue.locality ?? '',
      postal_code: venue.postal_code ?? '', tags: venue.tags ?? [],
    };
    setS1(hydrateLocation(baseS1, locations));
    setDocs((venue.documents ?? []).map((doc: any) => ({ type: doc.type, url: doc.url })));
    setS2({ gstin: venue.gstin ?? '', pan: venue.pan ?? '' });
    setS3({ owner_name: venue.owner_name ?? '', owner_email: venue.owner_email ?? '', owner_phone: venue.owner_phone ?? '', owner_dob: dateOnly(venue.owner_dob), owner_address: venue.owner_address ?? '' });
    setStatus(venue.status ?? 'APPROVED');
    setError('');
  }, [venue, locationsData]);

  const save = async () => {
    if (!venue) return;
    const step2 = { documents: docs.filter((doc) => doc.type && doc.url), ...s2 };
    const payload = { step1: { ...s1, capacity: Number(s1.capacity) || 1 }, step2, step3: s3 };
    try {
      await schema.validate(payload, { abortEarly: false });
      await updateVenue({ variables: { id: venue.id, ...payload, status } });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.errors?.[0] || err.message || 'Failed');
    }
  };

  return (
    <Dialog open={!!venue} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Venue</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stepper activeStep={step} alternativeLabel>{steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
          {error && <Alert severity="error">{error}</Alert>}
          {step === 0 && <VenueDetailsSection s1={s1} setS1={setS1} locations={locationsData?.locations ?? []} />}
          {step === 1 && <VenueDocsSection docs={docs} setDocs={setDocs} s2={s2} setS2={setS2} />}
          {step === 2 && <Stack spacing={2}>
            <VenueOwnerSection s3={s3} setS3={setS3} />
            <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.filter(Boolean).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Stack>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
        {step < steps.length - 1 ? <Button variant="contained" onClick={() => setStep(step + 1)}>Next</Button> : <Button variant="contained" onClick={save} disabled={state.loading}>Save</Button>}
      </DialogActions>
    </Dialog>
  );
}