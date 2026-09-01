import { Link as RouterLink, useNavigate } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import { BackHeader } from '@duncit/ui';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import { DuncitButton } from '@duncit/buttons';
import type { EditForm } from './queries';
import { useTranslation } from '@duncit/shell';

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
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <BackHeader
      onBack={() => navigate('/users')}
      backAriaLabel="back"
      backSize="medium"
      eyebrow={
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          <Link component={RouterLink} to="/users" underline="hover" color="inherit">
            {t('admin.users.title')}
          </Link>{' '}
          / Details
        </Typography>
      }
      title={user.full_name || user.email || user.user_id}
      actions={
        <Stack direction="row" spacing={1}>
        <DuncitButton size="small" variant="outlined" startIcon={<CallIcon />} onClick={onCallClick}>
          {t('admin.contact.call')}
        </DuncitButton>
        <DuncitButton size="small" variant="outlined" startIcon={<EmailIcon />} onClick={onEmailClick}>
          {t('shell.common.email')}
        </DuncitButton>
        {status !== 'ACTIVE' && (
          <DuncitButton
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={busy}
            onClick={() => setStatus('ACTIVE')}
          >
            Activate
          </DuncitButton>
        )}
        {status !== 'INACTIVE' && (
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<PauseCircleIcon />}
            disabled={busy}
            onClick={() => setStatus('INACTIVE')}
          >
            Deactivate
          </DuncitButton>
        )}
        {status === 'SUSPENDED' ? (
          <DuncitButton
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={busy}
            onClick={() => setStatus('ACTIVE')}
          >
            Unblock
          </DuncitButton>
        ) : (
          <DuncitButton
            size="small"
            variant="outlined"
            color="error"
            startIcon={<BlockIcon />}
            disabled={busy}
            onClick={() => setStatus('SUSPENDED')}
          >
            Block
          </DuncitButton>
        )}
        <DuncitButton
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={busy}
          onClick={onDeleteClick}
        >
          {t('shell.common.delete')}
        </DuncitButton>
        </Stack>
      }
    />
  );
}
