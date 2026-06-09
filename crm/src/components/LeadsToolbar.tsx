import { Box, Button, Chip, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import HandymanIcon from '@mui/icons-material/Handyman';

interface ChipOption {
  label: string;
  value: string;
}

interface ChipGroupProps {
  label: string;
  selected: string;
  options: ChipOption[];
  onChange: (value: string) => void;
}

function ChipGroup({ label, selected, options, onChange }: Readonly<ChipGroupProps>) {
  if (!options.length) return null;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
        {label}:
      </Typography>
      <Chip label="All" size="small" color={selected ? 'default' : 'primary'} variant={selected ? 'outlined' : 'filled'} onClick={() => onChange('')} />
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          size="small"
          color={selected === opt.value ? 'primary' : 'default'}
          variant={selected === opt.value ? 'filled' : 'outlined'}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </Stack>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
  createLabel: string;
  status?: { selected: string; options: ChipOption[]; onChange: (value: string) => void };
  priority?: { selected: string; options: ChipOption[]; onChange: (value: string) => void };
  superCategory?: { selected: string; options: ChipOption[]; onChange: (value: string) => void };
  onFillWithAi?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onDownloadTemplate?: () => void;
  onManageServices?: () => void;
  manageServicesLabel?: string;
}

export default function LeadsToolbar({
  title,
  subtitle,
  search,
  onSearch,
  onCreate,
  createLabel,
  status,
  priority,
  superCategory,
  onFillWithAi,
  onImport,
  onExport,
  onDownloadTemplate,
  onManageServices,
  manageServicesLabel = 'Manage Services',
}: Readonly<Props>) {
  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={800}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }} useFlexGap>
          <TextField
            size="small"
            placeholder="Search…"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
            sx={{ flex: 1, minWidth: 200 }}
          />
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} sx={{ whiteSpace: 'nowrap' }}>
            {createLabel}
          </Button>
        </Stack>
      </Stack>
      {(status || priority || superCategory) && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          {superCategory && <ChipGroup label="Super Category" {...superCategory} />}
          {status && <ChipGroup label="Status" {...status} />}
          {priority && <ChipGroup label="Priority" {...priority} />}
        </Stack>
      )}
    </Stack>
  );
}
