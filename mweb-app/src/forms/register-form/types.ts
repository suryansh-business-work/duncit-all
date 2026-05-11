export interface RegisterFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  password: string;
  dob: string;
  country: string;
  city: string;
  zone: string;
}

export const DEFAULTS: RegisterFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone_extension: '+91',
  phone_number: '',
  password: '',
  dob: '',
  country: 'IN',
  city: '',
  zone: '',
};
