import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import type { EditForm } from './queries';

interface Props {
  user: any;
  status: EditForm['status'];
  busy: boolean;
  setStatus: (status: EditForm['status']) => void;
  onCallClick: () => void;
  onEmailClick: () => void;
  onDeleteClick: () => void;
}

export default function UserHeader({
  user,
  status,
  busy,
  setStatus,
  onCallClick,
  onEmailClick,
  onDeleteClick,
}: Props) {
  const navigate = useNavigate();
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton onClick={() => navigate('/users')} aria-label="back">
        <ArrowBackIcon />
      </IconButton>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <Link component={RouterLink} to="/users" underline="hover" color="inherit">
            Users
          </Link>{' '}
          / Details
        </Typography>
        <Typography variant="h5">{user.full_name || user.email || user.user_id}</Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<CallIcon />} onClick={onCallClick}>
          Call
        </Button>
        <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={onEmailClick}>
          Email
        </Button>
        {status !== 'ACTIVE' && (
          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={busy}
            onClick={() => setStatus('ACTIVE')}
          >
            Activate
          </Button>
        )}
        {status !== 'INACTIVE' && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PauseCircleIcon />}
            disabled={busy}
            onClick={() => setStatus('INACTIVE')}
          >
            Deactivate
          </Button>
        )}
        {status !== 'SUSPENDED' ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<BlockIcon />}
            disabled={busy}
            onClick={() => setStatus('SUSPENDED')}
          >
            Block
          </Button>
        ) : (
          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={busy}
            onClick={() => setStatus('ACTIVE')}
          >
            Unblock
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={busy}
          onClick={onDeleteClick}
        >
          Delete
        </Button>
      </Stack>
    </Stack>
  );
}
