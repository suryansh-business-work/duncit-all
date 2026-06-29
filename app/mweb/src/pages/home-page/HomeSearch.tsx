import { useNavigate } from 'react-router-dom';
import { Box, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  locationId?: string;
  zoneName?: string;
  /** Disabled when there are no clubs/pods to search. */
  disabled?: boolean;
}

/** Home-page search launcher — tapping it opens the full Search experience
 * (clubs, pods, categories, suggestions, sort & filter) at /search. */
export default function HomeSearch({ disabled }: Readonly<Props>) {
  const navigate = useNavigate();
  const open = () => {
    if (!disabled) navigate('/search');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        fullWidth
        size="small"
        disabled={disabled}
        placeholder={disabled ? 'No pods to search yet' : 'Search clubs, pods, categories or activities…'}
        onClick={open}
        onFocus={open}
        inputProps={{
          'aria-label': 'Search Duncit',
          enterKeyHint: 'search',
          readOnly: true,
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'background.paper',
            minHeight: 44,
            cursor: disabled ? 'default' : 'pointer',
          },
        }}
      />
    </Box>
  );
}
