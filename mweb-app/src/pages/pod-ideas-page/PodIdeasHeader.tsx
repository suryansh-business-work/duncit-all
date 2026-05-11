import {
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SearchIcon from '@mui/icons-material/Search';

interface PodIdeasHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  onShare: () => void;
}

export default function PodIdeasHeader({ search, setSearch, onShare }: PodIdeasHeaderProps) {
  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <LightbulbIcon color="warning" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Pod Ideas
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Suggest a pod, vote on community ideas, and join the conversation.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onShare}>
          Share idea
        </Button>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Search ideas…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
    </>
  );
}
