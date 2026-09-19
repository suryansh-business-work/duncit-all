import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent, LiteRegistration } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_REGISTER } from '../../graphql/registrations';
import { QuestionField } from './QuestionField';
import { defaultRegisterValues, makeRegisterSchema, toRegisterInput, type RegisterValues } from './register.types';
import { TicketStep, isSoldOut } from './TicketStep';

interface RegisterFormProps {
  event: LiteEvent;
  onDone: (registration: LiteRegistration) => void;
}

/** Step one picks the ticket; step two (when the host asked questions) answers them; then `liteRegister`. */
export function RegisterForm({ event, onDone }: Readonly<RegisterFormProps>) {
  const { t } = useWebT();
  const tickets = useMemo(() => event.tickets.filter((ticket) => ticket.is_active), [event.tickets]);
  const questions = event.questions;
  const [step, setStep] = useState<'ticket' | 'questions'>('ticket');
  const [error, setError] = useState('');
  const schema = useMemo(() => makeRegisterSchema(t, questions), [t, questions]);
  const [register] = useMutation(LITE_REGISTER);
  const firstOpen = tickets.find((ticket) => !isSoldOut(ticket))?.id ?? '';
  const { control, handleSubmit, trigger, formState } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultRegisterValues(questions, firstOpen),
  });

  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      const { data } = await register({ variables: { event_id: event.id, input: toRegisterInput(values, questions) } });
      if (data?.liteRegister) onDone(data.liteRegister);
    } catch (err) {
      setError(parseApiError(err, t('liteWeb.register.failed')));
    }
  });

  const next = async () => {
    if (await trigger(['ticket_id', 'quantity'])) setStep('questions');
  };

  const submitLabel = event.require_approval ? t('liteWeb.register.request') : t('liteWeb.register.submit');
  const onLastStep = step === 'questions' || questions.length === 0;
  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate data-testid="register-form">
      {step === 'ticket' ? <TicketStep control={control} tickets={tickets} /> : null}
      {step === 'questions' ? (
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('liteWeb.register.questionsTitle')}
          </Typography>
          {questions.map((question) => (
            <QuestionField key={question.id} control={control} question={question} />
          ))}
        </Stack>
      ) : null}
      {event.require_approval ? <Alert severity="info">{t('liteWeb.register.approvalNote')}</Alert> : null}
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        {step === 'questions' ? (
          <DuncitButton onClick={() => setStep('ticket')} data-testid="register-back">
            {t('liteWeb.register.back')}
          </DuncitButton>
        ) : null}
        {onLastStep ? (
          <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} data-testid="register-submit">
            {submitLabel}
          </DuncitButton>
        ) : (
          <DuncitButton variant="contained" onClick={next} data-testid="register-next">
            {t('liteWeb.register.next')}
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
