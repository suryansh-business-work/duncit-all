import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';

export const STATUS_OPTIONS = ['', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];

export interface CreateForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  password: string;
  dob: string;
  roles: string[];
  city: string;
  zone: string;
}

export const blankForm: CreateForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone_extension: '+91',
  phone_number: '',
  password: '',
  dob: '',
  roles: ['USER'],
  city: '',
  zone: '',
};

/**
 * A generated password becomes a real user's credential, so it must come from a
 * CSPRNG — Math.random() is seeded predictably and must never mint secrets
 * (Sonar S2245). Rejection sampling keeps every character equally likely: the
 * naive `% chars.length` is biased toward the start of the alphabet whenever
 * 256 is not a multiple of it.
 */
export function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const limit = 256 - (256 % chars.length);
  let out = '';
  while (out.length < 12) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(12));
    for (const byte of bytes) {
      if (byte < limit && out.length < 12) out += chars[byte % chars.length];
    }
  }
  return out;
}

export function initials(user: any) {
  return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.trim().toUpperCase() || 'U';
}

type Translate = (key: string) => string;

export function loginMeta(user: any, t: Translate) {
  const provider =
    user.last_login_provider || (user.auth_providers?.includes('GOOGLE') ? 'GOOGLE' : 'EMAIL');
  if (provider === 'GOOGLE') {
    return {
      provider,
      label: t('admin.users.google'),
      icon: <GoogleIcon fontSize="small" />,
      color: '#4285f4',
    };
  }
  if (provider === 'OTP') {
    return {
      provider,
      label: t('admin.users.phoneOtp'),
      icon: <PhoneOutlinedIcon fontSize="small" />,
      color: '#7c3aed',
    };
  }
  return {
    provider,
    label: t('shell.common.email'),
    icon: <EmailOutlinedIcon fontSize="small" />,
    color: '#0f766e',
  };
}
