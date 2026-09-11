import { useNavigate } from 'react-router';
import { Box, Paper, Stack, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import SupportShell from './SupportShell';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';

/**
 * "Chat with Us" — a single entry point into the real-time agent chat. The
 * ticket inbox and the "New ticket" shortcut used to live here too, but this
 * page now offers only "Chat live with an agent" (tickets have their own
 * sections in the Support hub).
 */
export default function LiveTicketsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <SupportShell title={t('mweb.common.chatWithUs')} backTo="/support">
      <Paper
        onClick={() => navigate('/live-chat')}
        sx={{ ...SURFACE_SX, p: 2, cursor: 'pointer' }}
      >
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'primary.contrastText',
              bgcolor: 'primary.main',
              flexShrink: 0,
            }}
          >
            <ForumOutlinedIcon fontSize="small" />
          </Box>
          <Typography sx={{ minWidth: 0, flex: 1, fontSize: '0.9375rem', fontWeight: 600 }} noWrap>
            {t('mweb.chatWithUs.chatLiveWithAnAgent')}
          </Typography>
          <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </Paper>
    </SupportShell>
  );
}
