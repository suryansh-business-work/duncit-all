import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@mui/material';
import DraggableDialogPaper from '../DraggableDialogPaper';
import { RECORD_USER_CONTACT_ACTION, START_RECORDED_USER_CALL } from '../queries';
import {
  CALL_STATUSES,
  EMAIL_STATUSES,
  buildContactActionSchema,
  contactActionInitialValues,
  toRecordContactInput,
  type ContactActionValues,
  type ContactType,
} from '../contact-action.form';
import ContactActionFormContent from './ContactActionFormContent';
import { buildContactTarget, openNativeContact } from './contactActionDialogHelpers';

interface Props {
  open: boolean;
  type: ContactType;
  user: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContactActionDialog({ open, type, user, onClose, onSaved }: Readonly<Props>) {
  const [recordAction] = useMutation(RECORD_USER_CONTACT_ACTION);
  const [startRecordedCall] = useMutation(START_RECORDED_USER_CALL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = useMemo(() => buildContactTarget(type, user), [type, user]);
  const schema = useMemo(() => buildContactActionSchema(type), [type]);
  const statusOptions = type === 'CALL' ? CALL_STATUSES : EMAIL_STATUSES;

  const { control, watch, reset, handleSubmit } = useForm<ContactActionValues>({
    defaultValues: contactActionInitialValues,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(contactActionInitialValues);
    setError(null);
  }, [type, open, reset]);

  const values = watch();

  const startRecorded = async (notes: string) => {
    setBusy(true);
    setError(null);
    try {
      await startRecordedCall({ variables: { input: { user_id: user.user_id, target, notes } } });
      onSaved();
      onClose();
    } catch (callError: any) {
      setError(callError.message || 'Failed to start recorded call');
    } finally {
      setBusy(false);
    }
  };

  const submit = handleSubmit(async (accepted) => {
    if (!target) {
      setError('Contact target missing');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await recordAction({ variables: { input: toRecordContactInput(accepted, user.user_id, type, target) } });
      onSaved();
      onClose();
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save contact log');
    } finally {
      setBusy(false);
    }
  });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} PaperComponent={DraggableDialogPaper} fullWidth maxWidth="sm">
      <ContactActionFormContent
        type={type}
        user={user}
        target={target}
        statusOptions={statusOptions}
        error={error}
        busy={busy}
        control={control}
        values={values}
        onClose={onClose}
        onSubmit={submit}
        onOpenNativeAction={(subject) => openNativeContact(type, target, subject)}
        onStartRecorded={startRecorded}
      />
    </Dialog>
  );
}
