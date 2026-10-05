import { Chip } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  url: string;
  /** A verified document: viewable, never cleared. */
  locked: boolean;
  onUpload: () => void;
  onClear: () => void;
  testId: string;
}

/** One document's file: an "Uploaded" chip once a PDF is picked, else the upload button. */
export default function DocumentFileControl({ url, locked, onUpload, onClear, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  if (url) {
    return (
      <Chip
        label={t('partners.common.uploaded')}
        color="success"
        size="small"
        onClick={() => window.open(url, '_blank')}
        onDelete={locked ? undefined : onClear}
        data-testid={`${testId}-uploaded`}
      />
    );
  }
  return (
    <DuncitButton
      size="small"
      startIcon={<UploadFileIcon />}
      variant="outlined"
      onClick={onUpload}
      data-testid={`${testId}-upload`}
    >
      {t('partners.registerVenuePage.uploadFile')}
    </DuncitButton>
  );
}
