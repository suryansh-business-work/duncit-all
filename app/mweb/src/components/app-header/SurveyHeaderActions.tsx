import LogoutIcon from '@mui/icons-material/Logout';
import { Stack, Tooltip } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
import { HEADER_ROUND_BUTTON_SX } from './headerButtonSx';
import { useTranslation } from '../../i18n/useTranslation';

interface SurveyHeaderActionsProps {
  onLogout: () => void;
}

export default function SurveyHeaderActions({ onLogout }: Readonly<SurveyHeaderActionsProps>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.75} sx={{
      alignItems: "center"
    }}>
      <Tooltip title={t('mweb.common.logout')}>
        <DuncitIconButton
          size="small"
          onClick={onLogout}
          aria-label={t('mweb.common.logout')}
          sx={HEADER_ROUND_BUTTON_SX}
        >
          <LogoutIcon sx={{ fontSize: 18 }} />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}
