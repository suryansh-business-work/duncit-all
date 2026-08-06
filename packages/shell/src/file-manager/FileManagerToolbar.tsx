import { useRef } from 'react';
import {
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { FILE_TYPE_OPTIONS, SORT_OPTIONS } from './queries';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  fileType: string;
  onFileType: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  selectedCount: number;
  canWrite: boolean;
  uploading: boolean;
  onUpload: (files: FileList) => void;
  onDeleteSelected: () => void;
  onRefresh: () => void;
}

export default function FileManagerToolbar({
  search,
  onSearch,
  fileType,
  onFileType,
  sort,
  onSort,
  selectedCount,
  canWrite,
  uploading,
  onUpload,
  onDeleteSelected,
  onRefresh,
}: Readonly<Props>) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      <TextField
        size="small"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search by file name"
        sx={{ flex: 1, minWidth: 220 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        select
        size="small"
        label="Type"
        value={fileType}
        onChange={(event) => onFileType(event.target.value)}
        sx={{ minWidth: 140 }}
      >
        {FILE_TYPE_OPTIONS.map((option) => (
          <MenuItem key={option.value || 'all'} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Sort"
        value={sort}
        onChange={(event) => onSort(event.target.value)}
        sx={{ minWidth: 160 }}
      >
        {SORT_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <Tooltip title="Reload">
        <IconButton size="small" onClick={onRefresh} aria-label="Reload files">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {selectedCount > 0 && canWrite && (
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={onDeleteSelected}
        >
          Delete {selectedCount}
        </Button>
      )}

      <Button
        size="small"
        variant="contained"
        startIcon={<UploadFileIcon />}
        onClick={() => input.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading…' : 'Upload'}
      </Button>
      {/* Any file, several at once — the point of a file manager rather than an
          image picker. The accept list stays open for the same reason. */}
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) onUpload(event.target.files);
          event.target.value = '';
        }}
      />
    </Stack>
  );
}
