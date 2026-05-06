import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MediaPickerDialog from '../components/MediaPickerDialog';

const MY_VENUE = gql`
  query MyVenue {
    myVenue {
      id
      step_completed
      status
      venue_name
      venue_type
      capacity
      description
      address_line1
      address_line2
      city
      state
      postal_code
      cover_image_url
      gstin
      pan
      documents {
        type
        url
      }
      owner_name
      owner_email
      owner_phone
      owner_dob
      owner_address
      reviewer_notes
    }
  }
`;
const STEP1 = gql`mutation V1($input: VenueStep1Input!) { submitVenueStep1(input: $input) { id step_completed status } }`;
const STEP2 = gql`mutation V2($input: VenueStep2Input!) { submitVenueStep2(input: $input) { id step_completed } }`;
const STEP3 = gql`mutation V3($input: VenueStep3Input!) { submitVenueStep3(input: $input) { id step_completed } }`;
const FINAL = gql`mutation VFinal { submitVenueFinal { id status } }`;

const VENUE_TYPES = ['Cafe', 'Restaurant', 'Sports Turf', 'Studio', 'Banquet', 'Park', 'Other'];
const DOC_TYPES = ['GST Certificate', 'PAN Card', 'Property Document', 'Trade License', 'Other'];
const STEPS = ['Details', 'Documents', 'Owner', 'Submit'];

type DocRow = { type: string; url: string };

export default function RegisterVenuePage() {
  const { data, loading, refetch } = useQuery(MY_VENUE);
  const [step, setStep] = useState(0);
  const [s1, set1] = useState({
    venue_name: '', venue_type: 'Cafe', capacity: 10, description: '',
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '',
    cover_image_url: '',
  });
  const [s2, set2] = useState<{ documents: DocRow[]; gstin: string; pan: string }>({
    documents: [],
    gstin: '', pan: '',
  });
  const [s3, set3] = useState({
    owner_name: '', owner_email: '', owner_phone: '', owner_dob: '', owner_address: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [coverPicker, setCoverPicker] = useState(false);
  const [docPickerIdx, setDocPickerIdx] = useState<number | null>(null);

  const [m1, m1State] = useMutation(STEP1);
  const [m2, m2State] = useMutation(STEP2);
  const [m3, m3State] = useMutation(STEP3);
  const [mFinal, mFinalState] = useMutation(FINAL);

  useEffect(() => {
    const v = data?.myVenue;
    if (!v) return;
    set1({
      venue_name: v.venue_name || '', venue_type: v.venue_type || 'Cafe',
      capacity: v.capacity || 10, description: v.description || '',
      address_line1: v.address_line1 || '', address_line2: v.address_line2 || '',
      city: v.city || '', state: v.state || '', postal_code: v.postal_code || '',
      cover_image_url: v.cover_image_url || '',
    });
    set2({
      documents: v.documents?.length ? v.documents.map((d: any) => ({ type: d.type, url: d.url })) : [],
      gstin: v.gstin || '', pan: v.pan || '',
    });
    set3({
      owner_name: v.owner_name || '', owner_email: v.owner_email || '',
      owner_phone: v.owner_phone || '', owner_dob: v.owner_dob ? v.owner_dob.slice(0, 10) : '',
      owner_address: v.owner_address || '',
    });
    setStep(Math.min(v.step_completed || 0, 3));
  }, [data]);

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!s1.venue_name.trim()) return 'Venue name required';
      if (!s1.address_line1.trim()) return 'Address required';
      if (!s1.city.trim() || !s1.state.trim() || !s1.postal_code.trim()) return 'City/State/PIN required';
    } else if (step === 1) {
      const valid = s2.documents.filter((d) => d.type && d.url);
      if (valid.length === 0) return 'Upload at least one document';
    } else if (step === 2) {
      if (!s3.owner_name.trim() || !s3.owner_email.trim() || !s3.owner_phone.trim())
        return 'Name, email and phone required';
    }
    return null;
  };

  const next = async () => {
    setErr(null);
    const v = validateStep();
    if (v) { setErr(v); return; }
    try {
      if (step === 0) await m1({ variables: { input: s1 } });
      else if (step === 1) {
        const docs = s2.documents.filter((d) => d.type && d.url);
        await m2({ variables: { input: { documents: docs, gstin: s2.gstin, pan: s2.pan } } });
      } else if (step === 2) {
        await m3({ variables: { input: { ...s3, owner_dob: s3.owner_dob || null } } });
      } else if (step === 3) {
        await mFinal();
        await refetch();
        return;
      }
      setStep((s) => Math.min(s + 1, 3));
      await refetch();
    } catch (e: any) { setErr(e.message); }
  };

  const status = data?.myVenue?.status;
  if (loading && !data) return <Typography>Loading…</Typography>;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', width: '100%', pb: 4 }}>
      <Typography variant="h5" fontWeight={700}>Register your venue</Typography>
      {status === 'SUBMITTED' && <Alert severity="info">Application under review.</Alert>}
      {status === 'APPROVED' && <Alert severity="success">Approved 🎉</Alert>}
      {status === 'REJECTED' && (
        <Alert severity="error">Rejected: {data?.myVenue?.reviewer_notes || 'See notes.'} Update and resubmit.</Alert>
      )}

      <Stepper
        activeStep={step}
        alternativeLabel
        sx={{
          '& .MuiStepLabel-label': { fontSize: 12, mt: 0.5, lineHeight: 1.2 },
          '& .MuiStepConnector-root': { top: 14 },
        }}
      >
        {STEPS.map((s) => (<Step key={s}><StepLabel>{s}</StepLabel></Step>))}
      </Stepper>

      <Card variant="outlined">
        <CardContent>
          {step === 0 && (
            <Stack spacing={2}>
              <TextField label="Venue name" required value={s1.venue_name} onChange={(e) => set1({ ...s1, venue_name: e.target.value })} />
              <TextField select label="Type" value={s1.venue_type} onChange={(e) => set1({ ...s1, venue_type: e.target.value })}>
                {VENUE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField type="number" label="Capacity" value={s1.capacity} onChange={(e) => set1({ ...s1, capacity: +e.target.value || 0 })} />
              <TextField label="Description" multiline minRows={3} value={s1.description} onChange={(e) => set1({ ...s1, description: e.target.value })} />

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">Cover image</Typography>
                {s1.cover_image_url && (
                  <Box component="img" src={s1.cover_image_url} sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1 }} />
                )}
                <Button startIcon={<UploadFileIcon />} variant="outlined" onClick={() => setCoverPicker(true)}>
                  {s1.cover_image_url ? 'Change cover image' : 'Upload cover image'}
                </Button>
              </Stack>

              <TextField label="Address line 1" required value={s1.address_line1} onChange={(e) => set1({ ...s1, address_line1: e.target.value })} />
              <TextField label="Address line 2" value={s1.address_line2} onChange={(e) => set1({ ...s1, address_line2: e.target.value })} />
              <Stack direction="row" spacing={1}>
                <TextField label="City" required fullWidth value={s1.city} onChange={(e) => set1({ ...s1, city: e.target.value })} />
                <TextField label="State" required fullWidth value={s1.state} onChange={(e) => set1({ ...s1, state: e.target.value })} />
                <TextField label="PIN" required fullWidth value={s1.postal_code} onChange={(e) => set1({ ...s1, postal_code: e.target.value })} />
              </Stack>
            </Stack>
          )}

          {step === 1 && (
            <Stack spacing={2}>
              <TextField label="GSTIN (optional)" value={s2.gstin} onChange={(e) => set2({ ...s2, gstin: e.target.value })} />
              <TextField label="PAN (optional)" value={s2.pan} onChange={(e) => set2({ ...s2, pan: e.target.value })} />
              <Typography variant="subtitle2">Documents</Typography>
              {s2.documents.length === 0 && (
                <Alert severity="info">Upload at least one supporting document (GST, PAN, property paper etc).</Alert>
              )}
              {s2.documents.map((d, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    select
                    label="Type"
                    size="small"
                    value={d.type || DOC_TYPES[0]}
                    sx={{ minWidth: 160 }}
                    onChange={(e) => {
                      const docs = [...s2.documents];
                      docs[i] = { ...d, type: e.target.value };
                      set2({ ...s2, documents: docs });
                    }}
                  >
                    {DOC_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                  {d.url ? (
                    <Chip
                      label="Uploaded ✓"
                      color="success"
                      size="small"
                      onClick={() => window.open(d.url, '_blank')}
                      onDelete={() => {
                        const docs = [...s2.documents];
                        docs[i] = { ...d, url: '' };
                        set2({ ...s2, documents: docs });
                      }}
                    />
                  ) : (
                    <Button
                      size="small"
                      startIcon={<UploadFileIcon />}
                      variant="outlined"
                      onClick={() => setDocPickerIdx(i)}
                    >
                      Upload file
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => set2({ ...s2, documents: s2.documents.filter((_, j) => j !== i) })}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => set2({ ...s2, documents: [...s2.documents, { type: DOC_TYPES[0], url: '' }] })}
              >
                Add document
              </Button>
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              <TextField label="Owner name" required value={s3.owner_name} onChange={(e) => set3({ ...s3, owner_name: e.target.value })} />
              <TextField label="Owner email" type="email" required value={s3.owner_email} onChange={(e) => set3({ ...s3, owner_email: e.target.value })} />
              <TextField label="Owner phone" required value={s3.owner_phone} onChange={(e) => set3({ ...s3, owner_phone: e.target.value })} />
              <TextField label="Owner DOB" type="date" InputLabelProps={{ shrink: true }} value={s3.owner_dob} onChange={(e) => set3({ ...s3, owner_dob: e.target.value })} />
              <TextField label="Owner address" multiline minRows={2} value={s3.owner_address} onChange={(e) => set3({ ...s3, owner_address: e.target.value })} />
            </Stack>
          )}

          {step === 3 && (
            <Stack spacing={2}>
              <Typography variant="body1">Review and submit your venue application.</Typography>
              <Box>
                <Typography variant="subtitle2">{s1.venue_name}</Typography>
                <Typography variant="caption" color="text.secondary">{s1.venue_type} · cap {s1.capacity} · {s1.city}</Typography>
              </Box>
              <Typography variant="caption">{s2.documents.filter((d) => d.url).length} documents · Owner: {s3.owner_name}</Typography>
            </Stack>
          )}

          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}

          <Stack direction="row" spacing={1} mt={3} justifyContent="space-between">
            <Button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            <Button
              variant="contained"
              onClick={next}
              disabled={
                m1State.loading || m2State.loading || m3State.loading || mFinalState.loading ||
                status === 'SUBMITTED' || status === 'APPROVED'
              }
            >
              {step === 3 ? 'Submit' : 'Next'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <MediaPickerDialog
        open={coverPicker}
        onClose={() => setCoverPicker(false)}
        onPicked={(url) => { set1({ ...s1, cover_image_url: url }); setCoverPicker(false); }}
        folder="/venues/cover"
        title="Upload cover image"
      />

      <MediaPickerDialog
        open={docPickerIdx !== null}
        onClose={() => setDocPickerIdx(null)}
        onPicked={(url) => {
          if (docPickerIdx === null) return;
          const docs = [...s2.documents];
          docs[docPickerIdx] = { ...docs[docPickerIdx], url };
          set2({ ...s2, documents: docs });
          setDocPickerIdx(null);
        }}
        folder="/venues/docs"
        title="Upload document"
        accept="image/*,application/pdf"
      />
    </Stack>
  );
}
