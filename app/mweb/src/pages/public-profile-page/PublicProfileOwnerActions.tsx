import { Button, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

export default function PublicProfileOwnerActions() {
  const navigate = useNavigate();
  const btnSx = { minHeight: 44, flex: 1 } as const;
  return (
    <Stack direction="row" spacing={1} sx={{ px: 1 }}>
      <Button
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={() => navigate('/account')}
        sx={btnSx}
        aria-label="Edit my profile"
      >
        Edit
      </Button>
      <Button
        variant="outlined"
        startIcon={<SettingsIcon />}
        onClick={() => navigate('/account')}
        sx={btnSx}
        aria-label="Open account settings"
      >
        Settings
      </Button>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/pod-ideas')}
        sx={btnSx}
        aria-label="Create a new pod idea"
      >
        New
      </Button>
    </Stack>
  );
}
