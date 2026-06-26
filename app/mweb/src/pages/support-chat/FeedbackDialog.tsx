import { useState } from 'react';
import { useMutation } from '@apollo/client';
import EmojiFeedbackDialog from './EmojiFeedbackDialog';
import { SUBMIT_SUPPORT_CHAT_FEEDBACK } from './queries';

interface Props {
  open: boolean;
  sessionId: string;
  /** Existing rating/comment so an already-rated chat shows the read-only view. */
  rating: number | null;
  comment: string | null;
  onClose: () => void;
  onSubmitted: (rating: number, comment: string) => void;
}

/** Chat satisfaction feedback (B8) — wires the chat mutation into the shared emoji dialog. */
export default function FeedbackDialog({
  open,
  sessionId,
  rating,
  comment,
  onClose,
  onSubmitted,
}: Readonly<Props>) {
  const [submit, { loading }] = useMutation(SUBMIT_SUPPORT_CHAT_FEEDBACK);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: number, note: string) => {
    setError(null);
    try {
      await submit({ variables: { session_id: sessionId, rating: value, comment: note || null } });
      onSubmitted(value, note);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your feedback.');
    }
  };

  return (
    <EmojiFeedbackDialog
      open={open}
      existingRating={rating}
      existingComment={comment}
      busy={loading}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
