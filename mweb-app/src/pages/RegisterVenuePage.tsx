import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Step, StepLabel, Stepper, Stack, Typography } from '@mui/material';
import MediaPickerDialog from '../components/MediaPickerDialog';
import DetailsStep from './register-venue-page/DetailsStep';
import DocumentsStep from './register-venue-page/DocumentsStep';
import OwnerStep from './register-venue-page/OwnerStep';
import SubmitStep from './register-venue-page/SubmitStep';
import { findSelectedLocation } from './register-venue-page/VenueLocationFields';
import { FINAL, MY_VENUE, STEP1, STEP2, STEP3 } from './register-venue-page/queries';
import {
  DOC_TYPES,
  STEPS,
  blankStep1,
  blankStep2,
  blankStep3,
  type VenueStep1,
  type VenueStep2,
  type VenueStep3,
} from './register-venue-page/types';
import { validateStep } from './register-venue-page/validation';

const hydrateLocation = (base: VenueStep1, locations: any[]): VenueStep1 => {
  const location = findSelectedLocation(locations, base);
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

export default function RegisterVenuePage() {
  const { data, loading, refetch } = useQuery(MY_VENUE);
  const [step, setStep] = useState(0);
  const [step1, setStep1] = useState<VenueStep1>(blankStep1);
  const [step2, setStep2] = useState<VenueStep2>(blankStep2);
  const [step3, setStep3] = useState<VenueStep3>(blankStep3);
  const [err, setErr] = useState<string | null>(null);
  const [submittedSteps, setSubmittedSteps] = useState<Record<number, boolean>>({});
  const [coverPicker, setCoverPicker] = useState(false);
  const [docPickerIdx, setDocPickerIdx] = useState<number | null>(null);

  const [saveStep1, step1State] = useMutation(STEP1);
  const [saveStep2, step2State] = useMutation(STEP2);
  const [saveStep3, step3State] = useMutation(STEP3);
  const [submitFinal, finalState] = useMutation(FINAL);
  const locations = data?.locations ?? [];

  useEffect(() => {
    const venue = data?.myVenue;
    if (!venue) return;
    const baseStep1 = {
      venue_name: venue.venue_name || '',
      venue_type: venue.venue_type || 'Cafe',
      capacity: venue.capacity || 10,
      description: venue.description || '',
      location_id: venue.location_id || '',
      country: venue.country || 'India',
      country_code: venue.country_code || 'IN',
      state: venue.state || '',
      state_code: venue.state_code || '',
      city: venue.city || '',
      locality: venue.locality || '',
      postal_code: venue.postal_code || '',
      address_line1: venue.address_line1 || '',
      address_line2: venue.address_line2 || '',
      cover_image_url: venue.cover_image_url || '',
      gallery: venue.gallery || [],
    };
    setStep1(hydrateLocation(baseStep1, locations));
    setStep2({
      documents: venue.documents?.length
        ? venue.documents.map((doc: any) => ({ type: doc.type, url: doc.url }))
        : [],
      gstin: venue.gstin || '',
      pan: venue.pan || '',
    });
    setStep3({
      owner_name: venue.owner_name || '',
      owner_email: venue.owner_email || '',
      owner_phone: venue.owner_phone || '',
      owner_dob: venue.owner_dob ? venue.owner_dob.slice(0, 10) : '',
      owner_address: venue.owner_address || '',
    });
    setStep(Math.min(venue.step_completed || 0, 3));
  }, [data?.myVenue, data?.locations]);

  const next = async () => {
    setErr(null);
    setSubmittedSteps((current) => ({ ...current, [step]: true }));
    const validationError = await validateStep(step, step1, step2, step3);
    if (validationError) return;

    try {
      if (step === 0) await saveStep1({ variables: { input: { ...step1, capacity: Number(step1.capacity) || 1 } } });
      if (step === 1) {
        const documents = step2.documents.filter((doc) => doc.type && doc.url);
        await saveStep2({ variables: { input: { documents, gstin: step2.gstin, pan: step2.pan } } });
      }
      if (step === 2) await saveStep3({ variables: { input: { ...step3, owner_dob: step3.owner_dob || null } } });
      if (step === 3) {
        await submitFinal();
        await refetch();
        return;
      }
      setStep((current) => Math.min(current + 1, 3));
      await refetch();
    } catch (error: any) {
      setErr(error.message);
    }
  };

  const status = data?.myVenue?.status;
  const busy = step1State.loading || step2State.loading || step3State.loading || finalState.loading;
  if (loading && !data) return <Typography>Loading...</Typography>;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', width: '100%', pb: 4 }}>
      <Typography variant="h5" fontWeight={700}>Register your venue</Typography>
      {status === 'SUBMITTED' && <Alert severity="info">Application under review.</Alert>}
      {status === 'APPROVED' && <Alert severity="success">Approved.</Alert>}
      {status === 'REJECTED' && <Alert severity="error">Rejected: {data?.myVenue?.reviewer_notes || 'See notes.'} Update and resubmit.</Alert>}

      <Stepper activeStep={step} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: 12, mt: 0.5, lineHeight: 1.2 }, '& .MuiStepConnector-root': { top: 14 } }}>
        {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Card variant="outlined">
        <CardContent>
          {step === 0 && <DetailsStep value={step1} locations={locations} onChange={setStep1} onCoverPick={() => setCoverPicker(true)} showAllErrors={submittedSteps[0]} />}
          {step === 1 && <DocumentsStep value={step2} onChange={setStep2} onDocPick={setDocPickerIdx} showAllErrors={submittedSteps[1]} />}
          {step === 2 && <OwnerStep value={step3} onChange={setStep3} showAllErrors={submittedSteps[2]} />}
          {step === 3 && <SubmitStep step1={step1} step2={step2} step3={step3} />}
          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          <Stack direction="row" spacing={1} mt={3} justifyContent="space-between">
            <Button disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
            <Button variant="contained" onClick={next} disabled={busy || status === 'SUBMITTED' || status === 'APPROVED'}>
              {step === 3 ? 'Submit' : 'Next'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <MediaPickerDialog open={coverPicker} onClose={() => setCoverPicker(false)} onPicked={(url) => { setStep1({ ...step1, cover_image_url: url }); setCoverPicker(false); }} folder="/venues/cover" title="Upload cover image" />
      <MediaPickerDialog open={docPickerIdx !== null} onClose={() => setDocPickerIdx(null)} onPicked={(url) => {
        if (docPickerIdx === null) return;
        const documents = [...step2.documents];
        documents[docPickerIdx] = { ...(documents[docPickerIdx] ?? { type: DOC_TYPES[0], url: '' }), url };
        setStep2({ ...step2, documents });
        setDocPickerIdx(null);
      }} folder="/venues/docs" title="Upload document" accept="image/*,application/pdf" />
    </Stack>
  );
}