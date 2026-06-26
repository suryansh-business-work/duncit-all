import ConfirmDialog from '../../../components/ConfirmDialog';
import FeedbackDialog from '../FeedbackDialog';
import EmailTranscriptDialog from '../EmailTranscriptDialog';
import ReopenReasonDialog from '../ReopenReasonDialog';
import type { SupportChatSession } from '../queries';

interface Props {
  sessionId: string;
  session: SupportChatSession | null;
  confirmOpen: boolean;
  resolving: boolean;
  onConfirmResolve: () => void;
  onCancelResolve: () => void;
  feedbackOpen: boolean;
  onCloseFeedback: () => void;
  onFeedbackSubmitted: (rating: number, comment: string) => void;
  emailOpen: boolean;
  onCloseEmail: () => void;
  reopenOpen: boolean;
  reopening: boolean;
  reopenError: string | null;
  onCloseReopen: () => void;
  onReopen: (reason: string) => void;
}

/** All chat overlays (resolve confirm, feedback, email, reopen) in one place to keep the page lean. */
export default function ChatDialogs({
  sessionId,
  session,
  confirmOpen,
  resolving,
  onConfirmResolve,
  onCancelResolve,
  feedbackOpen,
  onCloseFeedback,
  onFeedbackSubmitted,
  emailOpen,
  onCloseEmail,
  reopenOpen,
  reopening,
  reopenError,
  onCloseReopen,
  onReopen,
}: Readonly<Props>) {
  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Mark as resolved?"
        message="Are you sure your issue has been resolved?"
        confirmLabel="Yes, mark as resolved"
        cancelLabel="No, continue conversation"
        busy={resolving}
        onConfirm={onConfirmResolve}
        onClose={onCancelResolve}
      />
      <FeedbackDialog
        open={feedbackOpen}
        sessionId={sessionId}
        rating={session?.rating ?? null}
        comment={session?.feedback_comment ?? null}
        onClose={onCloseFeedback}
        onSubmitted={onFeedbackSubmitted}
      />
      <EmailTranscriptDialog open={emailOpen} sessionId={sessionId} onClose={onCloseEmail} />
      <ReopenReasonDialog
        open={reopenOpen}
        loading={reopening}
        error={reopenError}
        onClose={onCloseReopen}
        onSubmit={onReopen}
      />
    </>
  );
}
