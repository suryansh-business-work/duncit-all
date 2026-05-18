import { Button, Chip, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

interface Props {
  label: string;
  value: string;
  onPick: () => void;
}

export default function HostUploader({ label, value, onPick }: Props) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
      {value ? (
        <Chip label="Uploaded" color="success" size="small" onClick={() => window.open(value, '_blank')} />
      ) : (
        <Button startIcon={<UploadFileIcon />} variant="outlined" size="small" onClick={onPick}>Upload</Button>
      )}
    </Stack>
  );
}