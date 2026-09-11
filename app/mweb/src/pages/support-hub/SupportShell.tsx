import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { HEADER_BUTTON_SX } from '../support-chat/calmStyles';

interface Props {
  title: string;
  backTo?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** The support pages' inner header: a round back button, the title, and an
 * optional right action. Native twin: components/StackScreen. */
export default function SupportShell({ title, backTo, action, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const titleAlign = action ? 'center' : 'left';

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DuncitRoundButton
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          aria-label={t('mweb.common.back')}
          sx={HEADER_BUTTON_SX}
        >
          <ArrowBackRoundedIcon />
        </DuncitRoundButton>
        <Typography
          component="h1"
          noWrap
          sx={{ flex: 1, minWidth: 0, fontSize: '1.0625rem', fontWeight: 600, textAlign: titleAlign }}
        >
          {title}
        </Typography>
        {action}
      </Stack>

      <Box>{children}</Box>
    </Stack>
  );
}
