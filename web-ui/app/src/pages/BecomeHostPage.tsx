import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert, Button, Card, CardContent, Step, StepLabel, Stepper,
  TextField, Typography, Stack,
} from '@mui/material';

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

const STEPS = ['Personal', 'Identity', 'Verification', 'Confirmation'];

export default function BecomeHostPage() {
  const { data, loading, refetch } = useQuery(MY_HOST);
  const [step, setStep] = useState(0);
  const [s1, set1] = useState({ full_name: '', email: '', phone: '', dob: '' });
  const [s2, set2] = useState({ aadhar_number: '', pan_number: '', passport_photo_url: '' });
  const [s3, set3] = useState({ police_verification_url: '', full_address: '' });
  const [err, setErr] = useState<string | null>(null);

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

  const next = async () => {
    setErr(null);
    try {
      if (step === 0) await m1({ variables: { input: s1 } });
      else if (step === 1) await m2({ variables: { input: s2 } });
      else if (step === 2) await m3({ variables: { input: s3 } });
      else if (step === 3) { await mFinal(); await refetch(); return; }
      setStep((s) => Math.min(s + 1, 3));
      await refetch();
    } catch (e: any) { setErr(e.message); }
  };

  const status = data?.myHost?.status;
  if (loading && !data) return <Typography>Loading…</Typography>;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Typography variant="h5" fontWeight={700}>Become a Host</Typography>
      {status === 'SUBMITTED' && <Alert severity="info">Application under review.</Alert>}
      {status === 'APPROVED' && <Alert severity="success">Approved! You can host pods now.</Alert>}
      {status === 'REJECTED' && <Alert severity="error">Rejected: {data?.myHost?.reviewer_notes}</Alert>}
      <Stepper activeStep={step} alternativeLabel>
        {STEPS.map((s) => (<Step key={s}><StepLabel>{s}</StepLabel></Step>))}
      </Stepper>
      <Card variant="outlined">
        <CardContent>
          {step === 0 && (
            <Stack spacing={2}>
              <TextField label="Full name" required value={s1.full_name} onChange={(e) => set1({ ...s1, full_name: e.target.value })} />
              <TextField label="Email" type="email" required value={s1.email} onChange={(e) => set1({ ...s1, email: e.target.value })} />
              <TextField label="Phone" required value={s1.phone} onChange={(e) => set1({ ...s1, phone: e.target.value })} />
              <TextField label="DOB" type="date" required InputLabelProps={{ shrink: true }} value={s1.dob} onChange={(e) => set1({ ...s1, dob: e.target.value })} />
            </Stack>
          )}
          {step === 1 && (
            <Stack spacing={2}>
              <TextField label="Aadhar number" required value={s2.aadhar_number} onChange={(e) => set2({ ...s2, aadhar_number: e.target.value })} />
              <TextField label="PAN number" required value={s2.pan_number} onChange={(e) => set2({ ...s2, pan_number: e.target.value })} />
              <TextField label="Passport-size photo URL" required value={s2.passport_photo_url} onChange={(e) => set2({ ...s2, passport_photo_url: e.target.value })} />
            </Stack>
          )}
          {step === 2 && (
            <Stack spacing={2}>
              <TextField label="Police verification certificate URL" required value={s3.police_verification_url} onChange={(e) => set3({ ...s3, police_verification_url: e.target.value })} />
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
    </Stack>
  );
}
