import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import HandymanIcon from '@mui/icons-material/Handyman';
import { useTranslation } from '@duncit/shell';

interface Props {
  title: string;
  subtitle?: string;
  onFillWithAi?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onDownloadTemplate?: () => void;
  onManageServices?: () => void;
  manageServicesLabel?: string;
}

/**
 * Header row for the lead list pages: title + page-level tools. Search, filters
 * and the create button live in the DuncitTable toolbar on those pages now.
 */
export default function LeadsToolbar({
  title,
  subtitle,
  onFillWithAi,
  onImport,
  onExport,
  onDownloadTemplate,
  onManageServices,
  manageServicesLabel = 'Manage Services',
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
      <Box>
        <Typography variant="h5" fontWeight={800}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }} useFlexGap>
        {onManageServices && (
          <Tooltip title={t('crm.components.manageTheCatalogueOfServicesOffered')}>
            <Button startIcon={<HandymanIcon />} variant="outlined" onClick={onManageServices}>
              {manageServicesLabel}
            </Button>
          </Tooltip>
        )}
        {onFillWithAi && (
          <Tooltip title={t('crm.components.pasteAFreeTextDescriptionAnd')}>
            <Button startIcon={<AutoFixHighIcon />} variant="outlined" color="secondary" onClick={onFillWithAi}>
              Fill with AI
            </Button>
          </Tooltip>
        )}
        {onDownloadTemplate && (
          <Tooltip title={t('crm.components.downloadABlankExcelTemplateWith')}>
            <Button startIcon={<DescriptionIcon />} variant="outlined" onClick={onDownloadTemplate}>
              {t('crm.components.template')}
            </Button>
          </Tooltip>
        )}
        {onImport && (
          <Button startIcon={<FileUploadIcon />} variant="outlined" onClick={onImport}>
            {t('crm.userLeads.import')}
          </Button>
        )}
        {onExport && (
          <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={onExport}>
            {t('crm.userLeads.export')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
