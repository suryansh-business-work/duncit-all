import { useState } from 'react';

import type { useSupportChat } from '@/hooks/useSupportChat';
import { TranscriptFormat } from '@/generated/graphql/graphql';
import { shareTranscript } from '@/utils/transcript';
import { toErrorMessage } from '@/utils/errors';

type Chat = ReturnType<typeof useSupportChat>;

/**
 * UI state + handlers for the live-chat modals (resolve confirm, feedback,
 * email, reopen) and transcript downloads — keeps LiveChatScreen lean (≤200).
 */
export function useLiveChatActions(chat: Chat, scrollToEnd: (animated: boolean) => void) {
  const { send, resolve, reopen, submitFeedback, getTranscript, emailTranscript } = chat;
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
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
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);
  const [reopenError, setReopenError] = useState('');

  const submit = async (text: string, attachments: string[] = []) => {
    if (busy) return;
    setBusy(true);
    setSendError('');
    try {
      await send(text, attachments);
      scrollToEnd(true);
    } catch (e) {
      setSendError(toErrorMessage(e, 'Could not send the message.'));
    } finally {
      setBusy(false);
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

  const onReopenSubmit = async (reason: string) => {
    setReopenBusy(true);
    setReopenError('');
    try {
      await reopen(reason);
      setReopenOpen(false);
    } catch (e) {
      setReopenError(toErrorMessage(e, 'Could not re-open the chat.'));
    } finally {
      setReopenBusy(false);
    }
  };

  const download = async (format: TranscriptFormat) => {
    const t = await getTranscript(format);
    if (t) await shareTranscript(t);
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

  return {
    busy,
    setBusy,
    sendError,
    setSendError,
    submit,
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
    reopen: {
      open: reopenOpen,
      busy: reopenBusy,
      error: reopenError,
      setOpen: setReopenOpen,
      setError: setReopenError,
      submit: onReopenSubmit,
    },
    download,
  };
}
