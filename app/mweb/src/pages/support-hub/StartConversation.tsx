import { Box, Paper, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';

/** Primary "Start a conversation" CTA → real-time agent chat. */
export default function StartConversation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Paper
      onClick={() => navigate('/live-chat')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate('/live-chat');
      }}
      sx={{ ...SURFACE_SX, p: 2, cursor: 'pointer' }}
      aria-label={t('mweb.common.startAConversationWithSupport')}
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
          <ChatBubbleOutlineIcon fontSize="small" />
        </Box>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
          {t('mweb.common.startAConversation')}
        </Typography>
        <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
      </Stack>
    </Paper>
  );
}
