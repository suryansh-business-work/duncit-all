import { useState } from 'react';

import type { useTicketDetails } from '@/hooks/useUnifiedTickets';
import { TranscriptFormat } from '@/generated/graphql/graphql';
import { shareTranscript } from '@/utils/transcript';
import { toErrorMessage } from '@/utils/errors';

type Details = ReturnType<typeof useTicketDetails>;

/**
 * Modal/handler state for the ticket detail actions (reply, reopen, resolve,
 * feedback, transcript export) — keeps TicketDetailsScreen lean (≤200).
 */
export function useTicketActions(details: Details) {
  const { reply, reopen, resolve, submitFeedback, getTranscript, emailTranscript } = details;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);
  const [reopenError, setReopenError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Resolves to whether the reply was sent (so the composer only clears on
  // success). The composer guards empty text + double-submits while `busy`.
  const submitReply = async (text: string, attachments: string[]): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      await reply(text, attachments);
      return true;
    } catch (e) {
      setError(toErrorMessage(e, 'Could not send the reply.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onReopenSubmit = async (reason: string) => {
    setReopenBusy(true);
    setReopenError('');
    try {
      await reopen(reason);
      setReopenOpen(false);
    } catch (e) {
      setReopenError(toErrorMessage(e, 'Could not re-open the ticket.'));
    } finally {
      setReopenBusy(false);
    }
  };

  const confirmResolve = async () => {
    setResolveBusy(true);
    try {
      await resolve();
      setConfirmOpen(false);
      setFeedbackDone(false);
      setFeedbackError('');
      setFeedbackOpen(true);
    } finally {
      setResolveBusy(false);
    }
  };

  const onFeedback = async (rating: number, comment: string) => {
    setFeedbackBusy(true);
    setFeedbackError('');
    try {
      await submitFeedback(rating, comment);
      setFeedbackDone(true);
    } catch (e) {
      setFeedbackError(toErrorMessage(e, 'Could not submit feedback.'));
    } finally {
      setFeedbackBusy(false);
    }
  };

  const onEmail = async (email: string) => {
    setEmailBusy(true);
    setEmailError('');
    try {
      await emailTranscript(email);
      setEmailDone(true);
    } catch (e) {
      setEmailError(toErrorMessage(e, 'Could not email the transcript.'));
    } finally {
      setEmailBusy(false);
    }
  };

  const download = async (format: TranscriptFormat) => {
    const t = await getTranscript(format);
    if (t) await shareTranscript(t);
  };

  return {
    busy,
    error,
    submitReply,
    reopen: {
      open: reopenOpen,
      busy: reopenBusy,
      error: reopenError,
      setOpen: setReopenOpen,
      setError: setReopenError,
      submit: onReopenSubmit,
    },
    confirm: { open: confirmOpen, busy: resolveBusy, setOpen: setConfirmOpen, run: confirmResolve },
    feedback: {
      open: feedbackOpen,
      busy: feedbackBusy,
      done: feedbackDone,
      error: feedbackError,
      setOpen: setFeedbackOpen,
      submit: onFeedback,
    },
    email: {
      open: emailOpen,
      busy: emailBusy,
      done: emailDone,
      error: emailError,
      setOpen: setEmailOpen,
      setDone: setEmailDone,
      setError: setEmailError,
      send: onEmail,
    },
    download,
  };
}
