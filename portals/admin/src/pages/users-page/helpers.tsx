import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import GoogleIcon from '@mui/icons-material/Google';

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

export function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function initials(user: any) {
  return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.trim().toUpperCase() || 'U';
}

export function loginMeta(user: any) {
  const provider =
    user.last_login_provider || (user.auth_providers?.includes('GOOGLE') ? 'GOOGLE' : 'EMAIL');
  return {
    provider,
    label: provider === 'GOOGLE' ? 'Google' : 'Email',
    icon:
      provider === 'GOOGLE' ? (
        <GoogleIcon fontSize="small" />
      ) : (
        <EmailOutlinedIcon fontSize="small" />
      ),
    color: provider === 'GOOGLE' ? '#4285f4' : '#0f766e',
  };
}
