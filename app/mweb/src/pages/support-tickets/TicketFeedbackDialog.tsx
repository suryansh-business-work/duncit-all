import { useState } from 'react';
import { useMutation } from '@apollo/client';
import EmojiFeedbackDialog from '../support-chat/EmojiFeedbackDialog';
import { SUBMIT_TICKET_FEEDBACK } from './queries';

interface Props {
  open: boolean;
  ticketId: string;
  /** Existing rating/comment so an already-rated ticket shows the read-only view. */
  rating: number | null;
  comment: string | null;
  onClose: () => void;
  onSubmitted: (rating: number, comment: string) => void;
}

/** Ticket satisfaction feedback (B8) — wires the ticket mutation into the shared emoji dialog. */
export default function TicketFeedbackDialog({
  open,
  ticketId,
  rating,
  comment,
  onClose,
  onSubmitted,
}: Readonly<Props>) {
  const [submit, { loading }] = useMutation(SUBMIT_TICKET_FEEDBACK);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: number, note: string) => {
    setError(null);
    try {
      await submit({ variables: { ticket_id: ticketId, rating: value, comment: note || null } });
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
