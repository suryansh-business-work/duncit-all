import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
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
  const account = data?.me;
  const accountEmail = account?.email || '';
  const accountName = account?.full_name || [account?.first_name, account?.last_name].filter(Boolean).join(' ');
  const locations = data?.locations ?? [];
  const currentVenue = data?.myVenue;
  const currentMode = location.pathname.endsWith('/current');
  const hydrateExisting = currentMode || currentVenue?.status === 'DRAFT' || currentVenue?.status === 'REJECTED';

  useEffect(() => {
    const venue = currentVenue;
    if (!venue || !hydrateExisting) {
      setStep1(blankStep1);
      setStep2(blankStep2);
      setStep3({ ...blankStep3, owner_name: accountName, owner_email: accountEmail });
      setStep(0);
      return;
    }
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
      owner_name: venue.owner_name || accountName,
      owner_email: accountEmail || venue.owner_email || '',
      owner_phone: venue.owner_phone || '',
      owner_dob: venue.owner_dob ? venue.owner_dob.slice(0, 10) : '',
      owner_address: venue.owner_address || '',
    });
    setStep(Math.min(venue.step_completed || 0, 3));
  }, [currentVenue, data?.locations, hydrateExisting, accountEmail, accountName]);

  const next = async () => {
    setErr(null);
    setSubmittedSteps((current) => ({ ...current, [step]: true }));
    const accountOwnerStep = { ...step3, owner_email: accountEmail || step3.owner_email };
    const validationError = await validateStep(step, step1, step2, accountOwnerStep);
    if (validationError) return;

    try {
      if (step === 0) await saveStep1({ variables: { input: { ...step1, capacity: Number(step1.capacity) || 1 } } });
      if (step === 1) {
        const documents = step2.documents.filter((doc) => doc.type && doc.url);
        await saveStep2({ variables: { input: { documents, gstin: step2.gstin, pan: step2.pan } } });
      }
      if (step === 2) await saveStep3({ variables: { input: { ...accountOwnerStep, owner_dob: accountOwnerStep.owner_dob || null } } });
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

  const status = hydrateExisting ? currentVenue?.status : undefined;
  const busy = step1State.loading || step2State.loading || step3State.loading || finalState.loading;
  // A submitted/approved venue is view-only: fields are disabled and the user can
  // only page through the steps to review what was submitted (item 8).
  const readOnly = status === 'SUBMITTED' || status === 'APPROVED';
  if (loading && !data) return <Typography>Loading...</Typography>;

  // The primary action communicates the real state: a read-only venue lets the
  // owner page forward to review, then shows its status on the final step.
  let actionLabel: string;
  if (readOnly && step < 3) actionLabel = 'Next';
  else if (status === 'APPROVED') actionLabel = 'Approved';
  else if (status === 'SUBMITTED') actionLabel = 'Under review';
  else actionLabel = step === 3 ? 'Submit for review' : 'Save & continue';
  const showSendIcon = step === 3 && !readOnly;
  const primaryDisabled = busy || (readOnly && step >= 3);
  const handlePrimary = () => {
    if (readOnly) {
      if (step < 3) setStep((current) => Math.min(current + 1, 3));
      return;
    }
    void next();
  };

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%', pb: 'calc(var(--duncit-bottom-nav-height, 72px) + 18px)' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'primary.contrastText', background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)` }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 0.4, lineHeight: 1, fontWeight: 800 }}>Host tools</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
              Register your venue
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600, mt: 0.5 }}>
              4 steps · submit your space for review
            </Typography>
          </Box>
          {status && <Chip size="small" label={status} sx={{ bgcolor: status === 'APPROVED' ? 'success.main' : 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800 }} />}
        </Stack>
      </Box>
      {status === 'SUBMITTED' && <Alert severity="info">Application under review — view only.</Alert>}
      {status === 'APPROVED' && <Alert severity="success">Approved — this venue is view-only.</Alert>}
      {status === 'REJECTED' && <Alert severity="error">Rejected: {data?.myVenue?.reviewer_notes || 'See notes.'} Update and resubmit.</Alert>}

      <Stepper activeStep={step} alternativeLabel sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', '& .MuiStepIcon-root': { fontSize: 30 }, '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { color: 'primary.main' }, '& .MuiStepLabel-label': { fontSize: 11.5, mt: 0.5, lineHeight: 1.2, fontWeight: 800 } }}>
        {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <fieldset
            disabled={readOnly}
            aria-disabled={readOnly}
            style={{
              border: 0,
              padding: 0,
              margin: 0,
              minInlineSize: 'auto',
              // The native disabled fieldset covers real inputs; pointer-events
              // also neutralises MUI's div-based Select/Chip controls (item 8).
              pointerEvents: readOnly ? 'none' : undefined,
            }}
          >
            {step === 0 && <DetailsStep value={step1} locations={locations} onChange={setStep1} onCoverPick={() => setCoverPicker(true)} showAllErrors={submittedSteps[0]} />}
            {step === 1 && <DocumentsStep value={step2} onChange={setStep2} onDocPick={setDocPickerIdx} showAllErrors={submittedSteps[1]} />}
            {step === 2 && <OwnerStep value={step3} onChange={setStep3} showAllErrors={submittedSteps[2]} accountEmail={accountEmail} />}
            {step === 3 && <SubmitStep step1={step1} step2={step2} step3={step3} status={status} />}
          </fieldset>
          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          <Stack direction="row" spacing={1.25} mt={3} sx={{ position: 'sticky', bottom: 'var(--duncit-bottom-nav-overlay-offset, 88px)', zIndex: 2, p: 1, mx: -0.75, borderRadius: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', boxShadow: 4 }}>
            <Button disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} variant="outlined" size="large" sx={{ borderRadius: 1, minWidth: 88, fontWeight: 800 }}>Back</Button>
            <Button variant="contained" color="primary" onClick={handlePrimary} disabled={primaryDisabled} size="large" endIcon={showSendIcon ? <SendIcon /> : undefined} sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}>
              {actionLabel}
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
      }} folder="/venues/docs" title="Upload document (PDF, max 50 MB)" accept="application/pdf" />
    </Stack>
  );
}