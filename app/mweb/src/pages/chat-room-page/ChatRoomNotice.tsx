import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

interface ChatRoomNoticeProps {
  ended?: boolean;
}

export default function ChatRoomNotice({ ended = false }: Readonly<ChatRoomNoticeProps>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          bgcolor: 'action.hover',
          borderRadius: 999,
          pl: 0.5,
          pr: ended ? 1.5 : 0.5,
          py: 0.5,
        }}>
        {ended ? (
          <Chip size="small" label={t('mweb.chatRoom.ended')} sx={{ height: 24, bgcolor: 'background.paper' }} />
        ) : (
          <Chip size="small" label={t('mweb.common.live')} color="success" sx={{ height: 24 }} />
        )}
        {ended ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }} noWrap>
            This pod has ended
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
