import * as yup from 'yup';

const numeric = (label: string) => yup.string().trim().matches(/^\d*$/, `${label} must be a whole number`);

const contactSchema = yup.object({
  name: yup.string().trim().max(80, 'Name is too long'),
  role: yup.string().trim().max(80, 'Role is too long'),
  mobile_number: yup.string().trim().matches(/^[0-9+\-\s]{0,20}$/, 'Enter a valid mobile number'),
  whatsapp_number: yup.string().trim().matches(/^[0-9+\-\s]{0,20}$/, 'Enter a valid WhatsApp number'),
  email: yup.string().trim().email('Enter a valid email'),
});

export const hostLeadSchema = yup.object({
  host_name: yup.string().trim().min(2, 'Host name is too short').max(120).required('Host name is required'),
  community_size: numeric('Community size'),
  past_attendees: numeric('Past attendees'),
  instagram_link: yup.string().trim().max(2048),
  community_link: yup.string().trim().max(2048),
  contacts: yup
    .array()
    .of(contactSchema)
    .min(1, 'Add at least one contact')
    .test('primary-mobile', 'Primary contact mobile number is required', (arr) => !!arr?.[0]?.mobile_number?.trim()),
  lead_status: yup.string().required('Lead status is required'),
  priority: yup.string().required('Priority is required'),
});
