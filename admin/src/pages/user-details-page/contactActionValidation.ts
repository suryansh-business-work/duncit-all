import * as yup from 'yup';

export const contactActionSchema = yup.object({
  type: yup.string().oneOf(['CALL', 'EMAIL']).required(),
  target: yup.string().trim().min(3).required('Target is required'),
  subject: yup.string().trim().max(160),
  notes: yup.string().trim().max(2000),
  status: yup.string().trim().max(40).required(),
  duration_seconds: yup.number().integer().min(0),
  recording_url: yup.string().trim().test('recording-url', 'Recording must be a valid URL', (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }),
});