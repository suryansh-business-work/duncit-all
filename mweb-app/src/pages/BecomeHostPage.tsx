import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert, Box, Button, Card, CardContent, Chip, Step, StepLabel, Stepper,
  TextField, Typography, Stack,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MediaPickerDialog from '../components/MediaPickerDialog';

const MY_HOST = gql`
  query MyHost {
    myHost {
      id step_completed status
      full_name email phone dob
      aadhar_number pan_number passport_photo_url
      police_verification_url full_address
      reviewer_notes
    }
  }
`;
const STEP1 = gql`mutation H1($input: HostStep1Input!) { submitHostStep1(input: $input) { id step_completed } }`;
const STEP2 = gql`mutation H2($input: HostStep2Input!) { submitHostStep2(input: $input) { id step_completed } }`;
const STEP3 = gql`mutation H3($input: HostStep3Input!) { submitHostStep3(input: $input) { id step_completed } }`;
const FINAL = gql`mutation HFinal { submitHostFinal { id status } }`;

const STEPS = ['Personal', 'Identity', 'Verify', 'Submit'];

type PickerKind = null | 'photo' | 'police';

export default function BecomeHostPage() {
  const { data, loading, refetch } = useQuery(MY_HOST);
  const [step, setStep] = useState(0);
  const [s1, set1] = useState({ full_name: '', email: '', phone: '', dob: '' });
  const [s2, set2] = useState({ aadhar_number: '', pan_number: '', passport_photo_url: '' });
  const [s3, set3] = useState({ police_verification_url: '', full_address: '' });
  const [err, setErr] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerKind>(null);

  const [m1, m1State] = useMutation(STEP1);
  const [m2, m2State] = useMutation(STEP2);
  const [m3, m3State] = useMutation(STEP3);
  const [mFinal, mFinalState] = useMutation(FINAL);

  useEffect(() => {
    const h = data?.myHost;
    if (!h) return;
    set1({ full_name: h.full_name || '', email: h.email || '', phone: h.phone || '', dob: h.dob ? h.dob.slice(0, 10) : '' });
    set2({ aadhar_number: h.aadhar_number || '', pan_number: h.pan_number || '', passport_photo_url: h.passport_photo_url || '' });
    set3({ police_verification_url: h.police_verification_url || '', full_address: h.full_address || '' });
    setStep(Math.min(h.step_completed || 0, 3));
  }, [data]);

  const validate = (): string | null => {
    if (step === 0) {
      if (!s1.full_name.trim() || !s1.email.trim() || !s1.phone.trim()) return 'All fields required';
    } else if (step === 1) {
      if (!s2.aadhar_number.trim() || !s2.pan_number.trim()) return 'Aadhar and PAN required';
      if (!s2.passport_photo_url) return 'Upload passport-size photo';
    } else if (step === 2) {
      if (!s3.police_verification_url) return 'Upload police verification';
      if (!s3.full_address.trim()) return 'Address required';
    }
    return null;
  };

  const next = async () => {
    setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }
    try {
      if (step === 0) await m1({ variables: { input: { ...s1, dob: s1.dob || null } } });
      else if (step === 1) await m2({ variables: { input: s2 } });
      else if (step === 2) await m3({ variables: { input: s3 } });
      else if (step === 3) { await mFinal(); await refetch(); return; }
      setStep((s) => Math.min(s + 1, 3));
      await refetch();
    } catch (e: any) { setErr(e.message); }
  };

  const status = data?.myHost?.status;
  if (loading && !data) return <Typography>Loading…</Typography>;

  const Uploader = ({ label, value, kind }: { label: string; value: string; kind: 'photo' | 'police' }) => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
      {value ? (
        <Chip label="Uploaded ✓" color="success" size="small" onClick={() => window.open(value, '_blank')} />
      ) : (
        <Button startIcon={<UploadFileIcon />} variant="outlined" size="small" onClick={() => setPicker(kind)}>
          Upload
        </Button>
      )}
    </Stack>
  );

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', width: '100%', pb: 4 }}>
      <Typography variant="h5" fontWeight={700}>Become a Host</Typography>
      {status === 'SUBMITTED' && <Alert severity="info">Application under review.</Alert>}
      {status === 'APPROVED' && <Alert severity="success">Approved! You can host pods now.</Alert>}
      {status === 'REJECTED' && <Alert severity="error">Rejected: {data?.myHost?.reviewer_notes}</Alert>}
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
              <TextField label="Full name" required value={s1.full_name} onChange={(e) => set1({ ...s1, full_name: e.target.value })} />
              <TextField label="Email" type="email" required value={s1.email} onChange={(e) => set1({ ...s1, email: e.target.value })} />
              <TextField label="Phone" required value={s1.phone} onChange={(e) => set1({ ...s1, phone: e.target.value })} />
              <TextField label="DOB" type="date" InputLabelProps={{ shrink: true }} value={s1.dob} onChange={(e) => set1({ ...s1, dob: e.target.value })} />
            </Stack>
          )}
          {step === 1 && (
            <Stack spacing={2}>
              <TextField label="Aadhar number" required value={s2.aadhar_number} onChange={(e) => set2({ ...s2, aadhar_number: e.target.value })} />
              <TextField label="PAN number" required value={s2.pan_number} onChange={(e) => set2({ ...s2, pan_number: e.target.value })} />
              {s2.passport_photo_url && (
                <Box component="img" src={s2.passport_photo_url} sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }} />
              )}
              <Uploader label="Passport-size photo" value={s2.passport_photo_url} kind="photo" />
            </Stack>
          )}
          {step === 2 && (
            <Stack spacing={2}>
              <Uploader label="Police verification certificate" value={s3.police_verification_url} kind="police" />
              <TextField label="Full address" required multiline minRows={3} value={s3.full_address} onChange={(e) => set3({ ...s3, full_address: e.target.value })} />
            </Stack>
          )}
          {step === 3 && (
            <Stack spacing={1}>
              <Typography variant="body1">Submit your application for review.</Typography>
              <Typography variant="caption" color="text.secondary">{s1.full_name} · {s1.email}</Typography>
            </Stack>
          )}
          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          <Stack direction="row" spacing={1} mt={3} justifyContent="space-between">
            <Button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            <Button variant="contained" onClick={next}
              disabled={m1State.loading || m2State.loading || m3State.loading || mFinalState.loading || status === 'SUBMITTED' || status === 'APPROVED'}>
              {step === 3 ? 'Submit' : 'Next'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <MediaPickerDialog
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPicked={(url) => {
          if (picker === 'photo') set2({ ...s2, passport_photo_url: url });
          else if (picker === 'police') set3({ ...s3, police_verification_url: url });
          setPicker(null);
        }}
        folder={picker === 'photo' ? '/hosts/photo' : '/hosts/docs'}
        title="Upload document"
        accept={picker === 'photo' ? 'image/*' : 'image/*,application/pdf'}
      />
    </Stack>
  );
}
