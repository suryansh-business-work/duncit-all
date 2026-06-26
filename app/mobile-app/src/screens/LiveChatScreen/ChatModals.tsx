import {
  EmailTranscriptModal,
  ReopenReasonModal,
  ResolveConfirmModal,
  SupportFeedbackModal,
} from '@/components/support-chat/SupportChatModals';
import type { useLiveChatActions } from './useLiveChatActions';

interface Props {
  actions: ReturnType<typeof useLiveChatActions>;
  rating?: number | null;
  feedbackComment?: string | null;
  reopenDeadlineLabel: string;
}

/** The live-chat dialogs (resolve confirm, feedback, email, reopen). */
export function ChatModals({
  actions: a,
  rating,
  feedbackComment,
  reopenDeadlineLabel,
}: Readonly<Props>) {
  return (
    <>
      <ResolveConfirmModal
        open={a.confirm.open}
        busy={a.confirm.busy}
        onConfirm={() => void a.confirm.run()}
        onCancel={() => a.confirm.setOpen(false)}
      />
      <SupportFeedbackModal
        open={a.feedback.open}
        busy={a.feedback.busy}
        done={a.feedback.done}
        error={a.feedback.error}
        rating={rating}
        feedbackComment={feedbackComment}
        onSubmit={(r, c) => void a.feedback.submit(r, c)}
        onClose={() => a.feedback.setOpen(false)}
      />
      <EmailTranscriptModal
        open={a.email.open}
        busy={a.email.busy}
        done={a.email.done}
        error={a.email.error}
        onSend={(em) => void a.email.send(em)}
        onClose={() => a.email.setOpen(false)}
      />
      <ReopenReasonModal
        open={a.reopen.open}
        busy={a.reopen.busy}
        error={a.reopen.error}
        deadlineLabel={reopenDeadlineLabel}
        onSubmit={(reason) => void a.reopen.submit(reason)}
        onClose={() => a.reopen.setOpen(false)}
      />
    </>
  );
}
