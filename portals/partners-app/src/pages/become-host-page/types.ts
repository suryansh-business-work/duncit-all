export interface HostStep1 {
  full_name: string;
  email: string;
  phone: string;
  dob: string;
}

export interface HostStep2 {
  aadhar_number: string;
  pan_number: string;
  passport_photo_url: string;
}

export interface HostStep3 {
  police_verification_url: string;
  full_address: string;
}

export const HOST_STEPS = ['Personal', 'Identity', 'Verify', 'Submit'];

export const blankHostStep1: HostStep1 = { full_name: '', email: '', phone: '', dob: '' };
export const blankHostStep2: HostStep2 = { aadhar_number: '', pan_number: '', passport_photo_url: '' };
export const blankHostStep3: HostStep3 = { police_verification_url: '', full_address: '' };