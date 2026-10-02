import { Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  onEdit: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onCopy: () => Promise<void>;
  onClone: () => Promise<void>;
  onDelete: () => void;
}

/** Edit / print / download / copy / clone / delete buttons in the page header. */
export function DocumentHeaderActions({ onEdit, onPrint, onDownload, onCopy, onClone, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.5} sx={{
      flexWrap: "wrap"
    }}>
      <DuncitButton size="small" startIcon={<EditIcon />} onClick={onEdit}>{t('shell.common.edit')}</DuncitButton>
      <DuncitButton size="small" startIcon={<PrintIcon />} onClick={onPrint}>{t('legal.documents.print')}</DuncitButton>
      <DuncitButton size="small" startIcon={<DownloadIcon />} onClick={onDownload}>{t('legal.documents.download')}</DuncitButton>
      <DuncitButton size="small" startIcon={<ContentCopyIcon />} onClick={onCopy}>{t('shell.common.copy')}</DuncitButton>
      <DuncitButton size="small" startIcon={<FileCopyIcon />} onClick={onClone}>{t('legal.documents.clone')}</DuncitButton>
      <DuncitButton size="small" color="error" startIcon={<DeleteIcon />} onClick={onDelete}>{t('shell.common.delete')}</DuncitButton>
    </Stack>
  );
}
