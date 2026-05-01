import { useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardIos';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';

const CREATE_INTERVIEW = gql`
  mutation CreateInterview($input: CreateInterviewInput!) {
    createInterview(input: $input) {
      id
      status
    }
  }
`;

interface Slot {
  start: Date;
  end: Date;
}

interface Props {
  type: 'HOST' | 'VENUE';
}

const TIME_OPTIONS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

const slotKey = (date: Date, hhmm: string) => `${date.toDateString()}|${hhmm}`;

const buildMonth = (anchor: Date) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const isPastDay = (d: Date) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return dd < t;
};

const isSameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

export default function InterviewBookingPage({ type }: Props) {
  const navigate = useNavigate();
  const [createMut] = useMutation(CREATE_INTERVIEW);

  const isHost = type === 'HOST';

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Map<string, Slot>>(new Map());

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [about, setAbout] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const cells = useMemo(() => buildMonth(anchor), [anchor]);

  const monthLabel = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const goPrevMonth = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const next = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    if (next.getFullYear() < t.getFullYear() || (next.getFullYear() === t.getFullYear() && next.getMonth() < t.getMonth()))
      return;
    setAnchor(next);
  };
  const goNextMonth = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));

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

  const slotList = Array.from(slots.values()).sort((a, b) => +a.start - +b.start);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Your name is required');
    if (!email.trim()) return setError('Email is required');
    if (!phone.trim()) return setError('Phone number is required');
    if (!about.trim()) return setError(`Tell us briefly about ${isHost ? 'why you want to host' : 'your venue'}`);
    if (slotList.length === 0) return setError('Pick at least one preferred time slot');

    setBusy(true);
    try {
      const res = await createMut({
        variables: {
          input: {
            type,
            applicant_name: name,
            applicant_email: email,
            applicant_phone: phone,
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (submittedRef) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Card>
          <CardContent>
            <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
              <Typography variant="h5" fontWeight={700} textAlign="center">
                Application received!
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                We've emailed you a confirmation. Our team will review your request and confirm one of your preferred meeting slots shortly.
              </Typography>
              <Chip label={`Reference · ${submittedRef.slice(-8)}`} variant="outlined" />
              <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                <Button variant="outlined" onClick={() => navigate('/')}>
                  Back to home
                </Button>
                <Button variant="contained" onClick={() => navigate('/profile')}>
                  My profile
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

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

        {/* Calendar */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{monthLabel}</Typography>
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={goPrevMonth}>
                  <ArrowBackIcon fontSize="inherit" />
                </IconButton>
                <IconButton size="small" onClick={goNextMonth}>
                  <ArrowForwardIcon fontSize="inherit" />
                </IconButton>
              </Stack>
            </Stack>
            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
              }}
            >
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Typography
                  key={`${d}-${i}`}
                  variant="caption"
                  align="center"
                  color="text.secondary"
                  sx={{ py: 1 }}
                >
                  {d}
                </Typography>
              ))}
              {cells.map((d, idx) => {
                if (!d) return <Box key={idx} />;
                const past = isPastDay(d);
                const active = selectedDate && isSameDay(d, selectedDate);
                return (
                  <Button
                    key={idx}
                    onClick={() => !past && setSelectedDate(d)}
                    disabled={past}
                    sx={{
                      minWidth: 0,
                      aspectRatio: '1 / 1',
                      borderRadius: '50%',
                      p: 0,
                      fontWeight: active ? 700 : 500,
                      bgcolor: active ? 'primary.main' : 'transparent',
                      color: active ? 'primary.contrastText' : past ? 'text.disabled' : 'text.primary',
                      '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                    }}
                  >
                    {d.getDate()}
                  </Button>
                );
              })}
            </Box>

            {selectedDate && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Pick time slots on {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {TIME_OPTIONS.map((t) => {
                    const key = slotKey(selectedDate, t);
                    const selected = slots.has(key);
                    return (
                      <Chip
                        key={t}
                        label={t}
                        variant={selected ? 'filled' : 'outlined'}
                        color={selected ? 'primary' : 'default'}
                        onClick={() => toggleSlot(selectedDate, t)}
                        icon={selected ? <CheckCircleIcon /> : undefined}
                      />
                    );
                  })}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Each slot is 1 hour. Choose up to 5 across any dates.
                </Typography>
              </Box>
            )}

            {slotList.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <EventAvailableIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2">Your preferred slots ({slotList.length}/5)</Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {slotList.map((s, i) => (
                    <Chip
                      key={i}
                      label={`${s.start.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} · ${s.start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
                      onDelete={() => {
                        const k = slotKey(s.start, s.start.toTimeString().slice(0, 5));
                        setSlots((prev) => {
                          const next = new Map(prev);
                          next.delete(k);
                          return next;
                        });
                      }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your details
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
                <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required />
              </Stack>
              <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth required />
              {!isHost && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Venue name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} fullWidth />
                  <TextField label="Venue address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} fullWidth />
                </Stack>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} fullWidth />
                <TextField label="Zone / Area" value={zone} onChange={(e) => setZone(e.target.value)} fullWidth />
              </Stack>
              <TextField
                label={isHost ? 'Why do you want to be a host?' : 'Tell us about your venue'}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                multiline
                minRows={4}
                fullWidth
                required
              />
            </Stack>
          </CardContent>
        </Card>

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

// Suppress unused MenuItem
void MenuItem;
