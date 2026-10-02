import { z } from 'zod';
import { email, filled, lowercase, maxLen, minLen, obj, shape, str, trim } from '@utils/zod-fields';

const isWebLinkOrEmpty = (value: string) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const urlOrEmpty = () =>
  str(z.string().check(maxLen(1000)).refine(isWebLinkOrEmpty, 'Must be an http(s) link'), {
    transforms: [trim],
    default: '',
  });

export const jobApplicationInputSchema = obj(
  shape({
    role_content_id: str(z.string().nullable(), { transforms: [trim], default: null }),
    role_title: str(z.string().check(filled('Role is required'), maxLen(160)), {
      required: 'Role is required',
      transforms: [trim],
    }),
    name: str(z.string().check(filled('Name is required'), minLen(2), maxLen(120)), {
      required: 'Name is required',
      transforms: [trim],
    }),
    email: str(z.string().check(filled('Email is required'), email('Enter a valid email'), maxLen(254)), {
      required: 'Email is required',
      transforms: [trim, lowercase],
    }),
    phone: str(
      z.string().refine((value) => !value || /^\+?\d{6,15}$/.test(value), 'Phone must be digits with optional + prefix'),
      { transforms: [trim], default: '' }
    ),
    resume_url: urlOrEmpty(),
    portfolio_url: urlOrEmpty(),
    cover_note: str(z.string().check(maxLen(4000)), { transforms: [trim], default: '' }),
  })
);
