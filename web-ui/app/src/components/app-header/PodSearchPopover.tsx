import {
  Avatar,
  Box,
  CircularProgress,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  anchor: HTMLElement | null;
  onClose: () => void;
  search: string;
  setSearch: (s: string) => void;
  loading: boolean;
  pods: any[];
  onSelect: (id: string) => void;
}

export default function PodSearchPopover({
  anchor,
  onClose,
  search,
  setSearch,
  loading,
  pods,
  onSelect,
}: Props) {
  return (
    <Popover
      open={!!anchor}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{ sx: { width: 360, p: 1.5 } }}
    >
      <TextField
        autoFocus
        fullWidth
        size="small"
        placeholder="Search pods…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Box sx={{ mt: 1, maxHeight: 320, overflow: 'auto' }}>
        {loading && (
          <Stack alignItems="center" sx={{ p: 2 }}>
            <CircularProgress size={20} />
          </Stack>
        )}
        {!loading && pods.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No pods found
          </Typography>
        )}
        {pods.slice(0, 8).map((p: any) => (
          <MenuItem key={p.id} onClick={() => onSelect(p.id)}>
            <ListItemIcon>
              <Avatar
                variant="rounded"
                src={p.pod_images_and_videos?.[0]?.url}
                sx={{ width: 32, height: 32 }}
              >
                <EventIcon fontSize="small" />
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={p.pod_title}
              secondary={
                p.pod_date_time ? new Date(p.pod_date_time).toLocaleString() : p.pod_id
              }
            />
          </MenuItem>
        ))}
      </Box>
    </Popover>
  );
}
