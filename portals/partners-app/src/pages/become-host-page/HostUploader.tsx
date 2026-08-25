import { Button, Chip, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from '@duncit/shell';

interface Props {
  label: string;
  value: string;
  onPick: () => void;
}

export default function HostUploader({ label, value, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
      {value ? (
        <Chip label={t('partners.common.uploaded')} color="success" size="small" onClick={() => window.open(value, '_blank')} />
      ) : (
        <Button startIcon={<UploadFileIcon />} variant="outlined" size="small" onClick={onPick}>{t('partners.becomeHostPage.upload')}</Button>
      )}
    </Stack>
  );
}