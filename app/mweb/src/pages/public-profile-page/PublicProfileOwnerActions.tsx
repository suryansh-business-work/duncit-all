import { Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

export default function PublicProfileOwnerActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const btnSx = { minHeight: 44, flex: 1 } as const;
  return (
    <Stack direction="row" spacing={1} sx={{ px: 1 }}>
      <DuncitButton
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={() => navigate('/account')}
        sx={btnSx}
        aria-label={t('mweb.profile.editMyProfile')}
      >
        Edit
      </DuncitButton>
      <DuncitButton
        variant="outlined"
        startIcon={<SettingsIcon />}
        onClick={() => navigate('/account')}
        sx={btnSx}
        aria-label={t('mweb.profile.openAccountSettings')}
      >
        Settings
      </DuncitButton>
      <DuncitButton
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/pod-ideas')}
        sx={btnSx}
        aria-label={t('mweb.profile.createANewPodIdea')}
      >
        New
      </DuncitButton>
    </Stack>
  );
}
