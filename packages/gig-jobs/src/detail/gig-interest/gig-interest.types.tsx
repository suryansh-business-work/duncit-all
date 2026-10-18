export interface GigInterestValues {
  message: string;
}

export interface GigInterestFormProps {
  busy: boolean;
  errorMessage: string | null;
  onSubmit: (values: GigInterestValues) => void | Promise<void>;
  onCancel: () => void;
}
