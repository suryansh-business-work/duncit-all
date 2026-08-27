import { Box, Stack, Tooltip, Typography } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import HandymanIcon from '@mui/icons-material/Handyman';
import { DuncitButton } from '@duncit/buttons';
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
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{
        alignItems: { md: 'center' },
        justifyContent: "space-between"
      }}>
      <Box>
        <Typography variant="h5" sx={{
          fontWeight: 800
        }}>{title}</Typography>
        {subtitle && <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{subtitle}</Typography>}
      </Box>
      <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }} useFlexGap>
        {onManageServices && (
          <Tooltip title={t('crm.components.manageTheCatalogueOfServicesOffered')}>
            <DuncitButton startIcon={<HandymanIcon />} variant="outlined" onClick={onManageServices}>
              {manageServicesLabel}
            </DuncitButton>
          </Tooltip>
        )}
        {onFillWithAi && (
          <Tooltip title={t('crm.components.pasteAFreeTextDescriptionAnd')}>
            <DuncitButton startIcon={<AutoFixHighIcon />} variant="outlined" color="secondary" onClick={onFillWithAi}>
              Fill with AI
            </DuncitButton>
          </Tooltip>
        )}
        {onDownloadTemplate && (
          <Tooltip title={t('crm.components.downloadABlankExcelTemplateWith')}>
            <DuncitButton startIcon={<DescriptionIcon />} variant="outlined" onClick={onDownloadTemplate}>
              {t('crm.components.template')}
            </DuncitButton>
          </Tooltip>
        )}
        {onImport && (
          <DuncitButton startIcon={<FileUploadIcon />} variant="outlined" onClick={onImport}>
            {t('crm.userLeads.import')}
          </DuncitButton>
        )}
        {onExport && (
          <DuncitButton startIcon={<FileDownloadIcon />} variant="outlined" onClick={onExport}>
            {t('crm.userLeads.export')}
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
