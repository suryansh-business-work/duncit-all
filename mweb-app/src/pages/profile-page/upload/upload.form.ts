import * as yup from 'yup';

export const UPLOAD_KINDS = ['IMAGE', 'VIDEO', 'DOCUMENT'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const ALLOWED_IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
export const ALLOWED_VIDEO_EXT = ['.mp4', '.mov', '.webm'];
export const ALLOWED_DOC_EXT = ['.pdf', '.docx', '.xlsx'];

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_DOC_SIZE_MB = 25;

export const uploadFormSchema = yup.object({
  kind: yup
    .mixed<UploadKind>()
    .oneOf([...UPLOAD_KINDS], 'Select a valid upload kind')
    .required('Kind is required'),
  file_name: yup
    .string()
    .trim()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .required('File name is required'),
  size_bytes: yup
    .number()
    .integer('Size must be an integer')
    .min(1, 'Size must be greater than 0')
    .required('Size is required'),
});

export type UploadFormValues = yup.InferType<typeof uploadFormSchema>;

export function isAllowedExt(name: string, kind: UploadKind) {
  const lower = name.toLowerCase();
  const allowed =
    kind === 'IMAGE' ? ALLOWED_IMAGE_EXT : kind === 'VIDEO' ? ALLOWED_VIDEO_EXT : ALLOWED_DOC_EXT;
  return allowed.some((ext) => lower.endsWith(ext));
}

export function maxSizeBytes(kind: UploadKind) {
  const mb = kind === 'IMAGE' ? MAX_IMAGE_SIZE_MB : kind === 'VIDEO' ? MAX_VIDEO_SIZE_MB : MAX_DOC_SIZE_MB;
  return mb * 1024 * 1024;
}

export function validateUpload(values: UploadFormValues) {
  const errors: Record<string, string> = {};
  if (!isAllowedExt(values.file_name, values.kind)) {
    errors.file_name = `File type not allowed for ${values.kind}`;
  }
  if (values.size_bytes > maxSizeBytes(values.kind)) {
    errors.size_bytes = `File too large; max is ${maxSizeBytes(values.kind) / (1024 * 1024)}MB`;
  }
  return errors;
}
