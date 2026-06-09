import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { CREATE_INTERVIEW } from './queries';
import { Slot, slotKey } from './slotHelpers';
import InterviewCalendar from './InterviewCalendar';
import InterviewDetailsForm from './InterviewDetailsForm';
import InterviewSuccessCard from './InterviewSuccessCard';
import { PHONE_EXTENSION_PATTERN, PHONE_NUMBER_PATTERN } from '../../forms/validation/rules';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  type: 'HOST' | 'VENUE';
}

export default function InterviewBookingPage({ type }: Readonly<Props>) {
  const navigate = useNavigate();
  const [createMut] = useMutation(CREATE_INTERVIEW);
  const isHost = type === 'HOST';

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Map<string, Slot>>(new Map());

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneExtension, setPhoneExtension] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [about, setAbout] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const toggleSlot = (date: Date, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const key = slotKey(date, hhmm);
    setSlots((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else {
        if (next.size >= 5) return prev;
        next.set(key, { start, end });
      }
      return next;
    });
  };

  const removeSlot = (slot: Slot) => {
    const k = slotKey(slot.start, slot.start.toTimeString().slice(0, 5));
    setSlots((prev) => {
      const next = new Map(prev);
      next.delete(k);
      return next;
    });
  };

  const slotList = Array.from(slots.values()).sort((a, b) => +a.start - +b.start);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Your name is required');
    if (!email.trim()) return setError('Email is required');
    if (!PHONE_EXTENSION_PATTERN.test(phoneExtension)) return setError('Phone code is invalid');
    if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) return setError('Phone must contain only digits (6-15 digits)');
    if (!about.trim())
      return setError(
        `Tell us briefly about ${isHost ? 'why you want to host' : 'your venue'}`
      );
    if (slotList.length === 0) return setError('Pick at least one preferred time slot');

    setBusy(true);
    try {
      const res = await createMut({
        variables: {
          input: {
            type,
            applicant_name: name,
            applicant_email: email,
            applicant_phone: `${phoneExtension} ${phoneNumber}`,
            about,
            business_name: businessName || null,
            business_address: businessAddress || null,
            city: city || null,
            zone: zone || null,
            preferred_slots: slotList.map((s) => ({
              start: s.start.toISOString(),
              end: s.end.toISOString(),
            })),
          },
        },
      });
      setSubmittedRef(res.data?.createInterview?.id ?? 'submitted');
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (submittedRef) return <InterviewSuccessCard submittedRef={submittedRef} />;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {isHost ? (
            <StorefrontIcon color="primary" sx={{ fontSize: 32 }} />
          ) : (
            <AddBusinessIcon color="primary" sx={{ fontSize: 32 }} />
          )}
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {isHost ? 'Become a Host' : 'Register Your Venue'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isHost
                ? 'Pick a few times that work for a quick onboarding interview.'
                : 'Tell us about your venue and pick times for a quick verification call.'}
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <InterviewCalendar
          anchor={anchor}
          setAnchor={setAnchor}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          slots={slots}
          onToggleSlot={toggleSlot}
          onRemoveSlot={removeSlot}
        />

        <InterviewDetailsForm
          isHost={isHost}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          phoneExtension={phoneExtension}
          setPhoneExtension={setPhoneExtension}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          businessName={businessName}
          setBusinessName={setBusinessName}
          businessAddress={businessAddress}
          setBusinessAddress={setBusinessAddress}
          city={city}
          setCity={setCity}
          zone={zone}
          setZone={setZone}
          about={about}
          setAbout={setAbout}
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={() => navigate(-1)}>Cancel</Button>
          <Button variant="contained" size="large" onClick={submit} disabled={busy}>
            {busy ? 'Submitting…' : 'Request Interview'}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
