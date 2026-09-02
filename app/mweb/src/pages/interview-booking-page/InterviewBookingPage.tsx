import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Container, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { DuncitButton } from '@duncit/buttons';
import { CREATE_INTERVIEW } from './queries';
import { Slot, slotKey } from './slotHelpers';
import InterviewCalendar from './InterviewCalendar';
import InterviewDetailsForm from './InterviewDetailsForm';
import InterviewSuccessCard from './InterviewSuccessCard';
import {
  interviewDetailsDefaults,
  makeInterviewDetailsSchema,
  toInterviewBookingInput,
  type InterviewDetailsValues,
} from './interview-booking';
import { parseApiError } from '../../utils/parseApiError';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  type: 'HOST' | 'VENUE';
}

export default function InterviewBookingPage({ type }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [createMut] = useMutation<any>(CREATE_INTERVIEW);
  const isHost = type === 'HOST';

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Map<string, Slot>>(new Map());

  // The applicant's boxes are a real form (rule 10): each one refuses on its
  // own line as it is typed into, against the shapes in @duncit/regex. Only the
  // calendar stays outside it — a picked slot is not a field.
  const schema = useMemo(() => makeInterviewDetailsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<
    InterviewDetailsValues,
    any,
    InterviewDetailsValues
  >({
    defaultValues: interviewDetailsDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<
      InterviewDetailsValues,
      any,
      InterviewDetailsValues
    >,
    mode: 'onTouched',
  });

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

  // The only refusal left for the alert: the calendar is not a form field, so
  // nothing under a box can carry it.
  const submit = handleSubmit(async (values) => {
    setError(null);
    if (slotList.length === 0) {
      setError(t('mweb.interviewBooking.pickAtLeastOnePreferredTime'));
      return;
    }

    setBusy(true);
    try {
      const res = await createMut({
        variables: {
          input: toInterviewBookingInput({
            ...values,
            type,
            preferred_slots: slotList.map((s) => ({
              start: s.start.toISOString(),
              end: s.end.toISOString(),
            })),
          }),
        },
      });
      setSubmittedRef(res.data?.createInterview?.id ?? 'submitted');
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  });

  if (submittedRef) return <InterviewSuccessCard submittedRef={submittedRef} />;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          {isHost ? (
            <StorefrontIcon color="primary" sx={{ fontSize: 32 }} />
          ) : (
            <AddBusinessIcon color="primary" sx={{ fontSize: 32 }} />
          )}
          <Box>
            <Typography variant="h5" sx={{
              fontWeight: 700
            }}>
              {isHost ? 'Become a Host' : 'Register Your Venue'}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
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

        <InterviewDetailsForm isHost={isHost} control={control} />

        <Stack direction="row" spacing={2} sx={{
          justifyContent: "flex-end"
        }}>
          <DuncitButton onClick={() => navigate(-1)}>{t('mweb.common.cancel')}</DuncitButton>
          <DuncitButton
            variant="contained"
            size="large"
            onClick={submit}
            disabled={busy || formState.isSubmitting}
          >
            {busy ? 'Submitting…' : 'Request Interview'}
          </DuncitButton>
        </Stack>
      </Stack>
    </Container>
  );
}
