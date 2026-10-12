export interface HideReasonValues {
  reason: string;
}

export interface HideReasonDialogProps {
  open: boolean;
  title: string;
  /** What hiding will do, naming the record — shown above the reason field. */
  body: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: HideReasonValues) => Promise<void> | void;
}
