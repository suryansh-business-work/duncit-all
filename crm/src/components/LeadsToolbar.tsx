import { Box, Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  title: string;
  subtitle?: string;
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
  createLabel: string;
}

export default function LeadsToolbar({ title, subtitle, search, onSearch, onCreate, createLabel }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
      <Box>
        <Typography variant="h5" fontWeight={800}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        <TextField
          size="small"
          placeholder="Search…"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} sx={{ whiteSpace: 'nowrap' }}>
          {createLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
