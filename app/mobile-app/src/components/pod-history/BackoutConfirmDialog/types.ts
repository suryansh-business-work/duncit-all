export interface BackoutConfirmDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (seats: number) => void;
  onViewTerms: () => void;
  /** Estimated refund after the Backouts deduction (null for free bookings). */
  refundAmount?: number | null;
  /** Refund for ONE seat after the deduction — prices a partial release. */
  refundPerSeat?: number | null;
  /** Seats this booking holds. More than one offers a partial release. */
  mySeats?: number;
  /** Backouts deduction % applied to the refund estimate. */
  deductionPct?: number;
  /** Coins returned if the WHOLE booking is released, after the same deduction. */
  refundCoins?: number;
}
