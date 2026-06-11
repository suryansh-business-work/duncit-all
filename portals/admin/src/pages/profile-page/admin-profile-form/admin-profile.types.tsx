export interface AdminProfileFormValues {
  first_name: string;
  last_name: string;
  phone_extension: string;
  phone_number: string;
  country: string;
  city: string;
  zone: string;
  bio: string;
  profile_photo: string;
}

export interface AdminProfileFormProps {
  initialValues: AdminProfileFormValues;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AdminProfileFormValues) => Promise<void> | void;
}