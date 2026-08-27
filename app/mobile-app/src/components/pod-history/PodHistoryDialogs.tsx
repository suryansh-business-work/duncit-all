import { BackoutConfirmDialog } from './BackoutConfirmDialog';
import { RejoinConfirmDialog } from './RejoinConfirmDialog';

export interface PodHistoryDialogsProps {
  backoutOpen: boolean;
  rejoinOpen: boolean;
  backingOut: boolean;
  rejoining: boolean;
  /** Seats the booking holds — the release picker's ceiling. */
  mySeats: number;
  onCloseBackout: () => void;
  onCloseRejoin: () => void;
  onConfirmBackout: (seats?: number) => void;
  onConfirmRejoin: () => void;
  onViewBackoutTerms: () => void;
}

/** The Backout and Rejoin confirmations a Pod History booking can raise, kept
 * together so the screen reads as its own content rather than its modals. */
export function PodHistoryDialogs({
  backoutOpen,
  rejoinOpen,
  backingOut,
  rejoining,
  mySeats,
  onCloseBackout,
  onCloseRejoin,
  onConfirmBackout,
  onConfirmRejoin,
  onViewBackoutTerms,
}: Readonly<PodHistoryDialogsProps>) {
  return (
    <>
      <BackoutConfirmDialog
        open={backoutOpen}
        busy={backingOut}
        onClose={onCloseBackout}
        onConfirm={onConfirmBackout}
        mySeats={mySeats}
        onViewTerms={onViewBackoutTerms}
      />
      <RejoinConfirmDialog
        open={rejoinOpen}
        busy={rejoining}
        onClose={onCloseRejoin}
        onConfirm={onConfirmRejoin}
      />
    </>
  );
}
