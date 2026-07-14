import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import HandymanIcon from '@mui/icons-material/Handyman';

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
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
      <Box>
        <Typography variant="h5" fontWeight={800}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }} useFlexGap>
        {onManageServices && (
          <Tooltip title="Manage the catalogue of services offered">
            <Button startIcon={<HandymanIcon />} variant="outlined" onClick={onManageServices}>
              {manageServicesLabel}
            </Button>
          </Tooltip>
        )}
        {onFillWithAi && (
          <Tooltip title="Paste a free-text description and let AI populate the form">
            <Button startIcon={<AutoFixHighIcon />} variant="outlined" color="secondary" onClick={onFillWithAi}>
              Fill with AI
            </Button>
          </Tooltip>
        )}
        {onDownloadTemplate && (
          <Tooltip title="Download a blank Excel template with instructions">
            <Button startIcon={<DescriptionIcon />} variant="outlined" onClick={onDownloadTemplate}>
              Template
            </Button>
          </Tooltip>
        )}
        {onImport && (
          <Button startIcon={<FileUploadIcon />} variant="outlined" onClick={onImport}>
            Import
          </Button>
        )}
        {onExport && (
          <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={onExport}>
            Export
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
