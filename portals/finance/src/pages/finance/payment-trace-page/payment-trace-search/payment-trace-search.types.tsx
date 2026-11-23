export interface PaymentTraceSearchValues {
  ref: string;
}

export interface PaymentTraceSearchProps {
  /** The id currently traced (from the address bar), shown in the field. */
  initialRef: string;
  busy: boolean;
  onSubmit: (ref: string) => void;
}
