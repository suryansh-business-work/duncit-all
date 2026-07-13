import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import HostStepContent from './HostStepContent';
import HostWithdrawApplication from './HostWithdrawApplication';
import PartnerPodsSection from '../pods-page/PartnerPodsSection';
import { FINAL, MY_HOST, STEP1, STEP2, STEP3, WITHDRAW_HOST } from './queries';
import { HOST_STEPS, blankHostStep1, blankHostStep2, blankHostStep3 } from './types';
import { validateHostStep } from './validation';

type PickerKind = null | 'photo' | 'police';

export default function BecomeHostPage() {
  const { data, loading, refetch } = useQuery(MY_HOST);
  const [step, setStep] = useState(0);
  const [s1, setS1] = useState(blankHostStep1);
  const [s2, setS2] = useState(blankHostStep2);
  const [s3, setS3] = useState(blankHostStep3);
  const [err, setErr] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerKind>(null);

  const [m1, m1State] = useMutation(STEP1);
  const [m2, m2State] = useMutation(STEP2);
  const [m3, m3State] = useMutation(STEP3);
  const [mFinal, mFinalState] = useMutation(FINAL);
  const [withdrawHost, withdrawState] = useMutation(WITHDRAW_HOST);
  const account = data?.me;
  const accountEmail = account?.email || '';
  const accountName = account?.full_name || [account?.first_name, account?.last_name].filter(Boolean).join(' ');

  useEffect(() => {
    const host = data?.myHost;
    if (!host) {
      setS1((current) => ({ ...current, full_name: current.full_name || accountName, email: accountEmail }));
      return;
    }
    setS1({ full_name: host.full_name || accountName, email: accountEmail || host.email || '', phone: host.phone || '', dob: host.dob ? host.dob.slice(0, 10) : '' });
    setS2({ aadhar_number: host.aadhar_number || '', pan_number: host.pan_number || '', passport_photo_url: host.passport_photo_url || '' });
    setS3({ police_verification_url: host.police_verification_url || '', full_address: host.full_address || '' });
    setStep(Math.min(host.step_completed || 0, 3));
  }, [data?.myHost, accountEmail, accountName]);

  const next = async () => {
    setErr(null);
    const accountStep1 = { ...s1, email: accountEmail || s1.email };
    const validationError = await validateHostStep(step, accountStep1, s2, s3);
    if (validationError) { setErr(validationError); return; }
    try {
      if (step === 0) await m1({ variables: { input: { ...accountStep1, dob: s1.dob || null } } });
      if (step === 1) await m2({ variables: { input: s2 } });
      if (step === 2) await m3({ variables: { input: s3 } });
      if (step === 3) { await mFinal(); await refetch(); return; }
      setStep((current) => Math.min(current + 1, 3));
      await refetch();
    } catch (error: any) {
      setErr(error.message);
    }
  };

  const status = data?.myHost?.status;
  // Anyone who already holds the HOST role (granted on approval, or directly by
  // an admin / via Super Admin) has already "become a host" — they get the
  // hosting area (their pods), never the become-a-host application flow.
  const isHost = (account?.roles ?? []).includes('HOST') || status === 'APPROVED';
  const busy = m1State.loading || m2State.loading || m3State.loading || mFinalState.loading || withdrawState.loading;
  const locked = status === 'SUBMITTED' || status === 'APPROVED';
  const withdraw = async () => {
    setErr(null);
    try {
      await withdrawHost();
      await refetch();
    } catch (error: any) {
      setErr(error.message);
    }
  };
  if (loading && !data) return <Typography>Loading...</Typography>;

  return (
    <Stack spacing={2.25}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'primary.contrastText', background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)` }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 800 }}>Partner tools</Typography>
            <Typography variant="h4" sx={{ fontWeight: 950 }}>{isHost ? 'Your hosting' : 'Become a host'}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 800 }}>
              {isHost ? 'Manage your pods and hosting profile.' : '4 steps - submit your profile for review'}
            </Typography>
          </Box>
          {status && <Chip size="small" label={isHost ? 'HOST' : status} sx={{ bgcolor: status === 'APPROVED' ? 'success.main' : 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 900 }} />}
        </Stack>
      </Box>
      {!isHost && (
        <>
          {status === 'SUBMITTED' && <Alert severity="info">Application under review.</Alert>}
          {status === 'REJECTED' && <Alert severity="error">Rejected: {data?.myHost?.reviewer_notes || 'See notes.'}</Alert>}
          <HostWithdrawApplication status={status} busy={busy} onWithdraw={withdraw} />
          <Stepper activeStep={step} alternativeLabel sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(17,24,39,0.05)' }}>
            {HOST_STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
          <Card variant="outlined">
            <CardContent>
              <HostStepContent step={step} s1={s1} s2={s2} s3={s3} set1={setS1} set2={setS2} set3={setS3} openPicker={setPicker} />
              {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
              <Stack direction="row" spacing={1} mt={3} justifyContent="space-between">
                <Button disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
                <Button variant="contained" onClick={next} disabled={busy || locked}>{step === 3 ? 'Submit' : 'Next'}</Button>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
      <PartnerPodsSection />
      <MediaPickerDialog open={picker !== null} onClose={() => setPicker(null)} onPicked={(url) => {
        if (picker === 'photo') setS2({ ...s2, passport_photo_url: url });
        if (picker === 'police') setS3({ ...s3, police_verification_url: url });
        setPicker(null);
      }} folder={picker === 'photo' ? '/hosts/photo' : '/hosts/docs'} title="Upload document" accept={picker === 'photo' ? 'image/*' : 'image/*,application/pdf'} />
    </Stack>
  );
}