import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Chip, Step, StepLabel, Stepper, Stack, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
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
  const locked = status === 'SUBMITTED' || status === 'APPROVED';
  if (loading && !data) return <Typography>Loading...</Typography>;

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%', pb: 2 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.25}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Register your venue
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            4 steps - submit your space for review
          </Typography>
        </Box>
        {status && <Chip size="small" label={status} color={status === 'APPROVED' ? 'success' : 'warning'} sx={{ fontWeight: 900 }} />}
      </Stack>
      {status === 'SUBMITTED' && <Alert severity="info">Application under review.</Alert>}
      {status === 'APPROVED' && <Alert severity="success">Approved.</Alert>}
      {status === 'REJECTED' && <Alert severity="error">Rejected: {data?.myVenue?.reviewer_notes || 'See notes.'} Update and resubmit.</Alert>}

      <Stepper activeStep={step} alternativeLabel sx={{ '& .MuiStepIcon-root': { fontSize: 34, color: 'action.hover' }, '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { color: 'primary.main', filter: 'drop-shadow(0 10px 18px rgba(255,79,115,0.28))' }, '& .MuiStepLabel-label': { fontSize: 11, mt: 0.5, lineHeight: 1.2, fontWeight: 950 }, '& .MuiStepConnector-root': { top: 16 }, '& .MuiStepConnector-line': { borderColor: 'primary.main', opacity: 0.45 } }}>
        {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {step === 0 && <DetailsStep value={step1} locations={locations} onChange={setStep1} onCoverPick={() => setCoverPicker(true)} showAllErrors={submittedSteps[0]} />}
          {step === 1 && <DocumentsStep value={step2} onChange={setStep2} onDocPick={setDocPickerIdx} showAllErrors={submittedSteps[1]} />}
          {step === 2 && <OwnerStep value={step3} onChange={setStep3} showAllErrors={submittedSteps[2]} />}
          {step === 3 && <SubmitStep step1={step1} step2={step2} step3={step3} />}
          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          <Stack direction="row" spacing={1.25} mt={3} sx={{ position: 'sticky', bottom: 'var(--duncit-bottom-nav-overlay-offset, 88px)', zIndex: 2, p: 0.75, mx: -0.75, borderRadius: 3, bgcolor: 'background.default' }}>
            <Button disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} variant="outlined" size="large" sx={{ borderRadius: 3, minWidth: 88, fontWeight: 950 }}>Back</Button>
            <Button variant="contained" onClick={next} disabled={busy || locked} size="large" endIcon={step === 3 ? <SendIcon /> : undefined} sx={{ flex: 1, borderRadius: 3, fontWeight: 950 }}>
              {step === 3 ? 'Submit for review' : 'Save & continue'}
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