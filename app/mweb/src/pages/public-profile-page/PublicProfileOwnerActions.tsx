import { Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import AddIcon from '@mui/icons-material/AddRounded';
import { DuncitButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

const PILL_SX = { minHeight: 44, flex: 1 } as const;
const SOFT_SX = { ...PILL_SX, bgcolor: 'action.hover' } as const;

export default function PublicProfileOwnerActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Stack direction="row" spacing={1}>
      <DuncitButton
        color="inherit"
        startIcon={<EditIcon />}
        onClick={() => navigate('/account')}
        sx={SOFT_SX}
        aria-label={t('mweb.profile.editMyProfile')}
      >
        Edit
      </DuncitButton>
      <DuncitButton
        color="inherit"
        startIcon={<SettingsIcon />}
        onClick={() => navigate('/account')}
        sx={SOFT_SX}
        aria-label={t('mweb.profile.openAccountSettings')}
      >
        Settings
      </DuncitButton>
      <DuncitButton
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/pod-ideas')}
        sx={PILL_SX}
        aria-label={t('mweb.profile.createANewPodIdea')}
      >
        New
      </DuncitButton>
    </Stack>
  );
}
