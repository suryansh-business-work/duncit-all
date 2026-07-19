import { Box, FormHelperText } from '@mui/material';
import { AttachmentUploadField, ATTACHMENT_ACCEPT_ALL } from '@duncit/media-picker';

interface Props {
  value: string;
  onChange: (url: string) => void;
  error?: string;
}

/** Venue Bill — a single image/PDF picked from the device and uploaded directly
 * to ImageKit (bypassing the API body cap), stored as one hosted URL string with
 * a preview + remove control. Device-upload only (no raw URL box). */
export default function BillUploadField({ value, onChange, error }: Readonly<Props>) {
  const list = value ? [value] : [];
  return (
    <Box>
      <AttachmentUploadField
        value={list}
        onChange={(next) => onChange(next[0] ?? '')}
        folder="/pod-bills"
        max={1}
        label="Venue Bill"
        accept={ATTACHMENT_ACCEPT_ALL}
        allowDocuments
        strategy="direct"
        previewVariant="card"
        errorVariant="chip"
        buttonLabel="Upload venue bill"
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}
