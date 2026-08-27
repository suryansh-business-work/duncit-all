import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The mock's pink gradient banner: "Host your own pod → Create Pod". Hosts go
 * straight to pod creation; everyone else is invited into the become-a-host
 * flow with the same banner.
 */
export default function HostCtaBanner({
  isHost,
  onCreatePod,
  onBecomeHost,
}: Readonly<{ isHost: boolean; onCreatePod: () => void; onBecomeHost: () => void }>) {
  const { t } = useTranslation();
  const title = isHost ? t('mweb.home.hostCtaTitle') : t('mweb.home.becomeHostCtaTitle');
  const subtitle = isHost ? t('mweb.home.hostCtaSubtitle') : t('mweb.home.becomeHostCtaSubtitle');
  const buttonLabel = isHost ? t('mweb.home.hostCtaButton') : t('mweb.home.becomeHostCtaButton');
  const onPress = isHost ? onCreatePod : onBecomeHost;

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '20px',
        p: 2,
        overflow: 'hidden',
        color: 'common.white',
        background: 'linear-gradient(120deg, #ff4f73 0%, #f5337a 55%, #ff8b5f 100%)',
        boxShadow: '0 16px 36px rgba(245,51,122,0.30)',
      }}
    >
      <AutoAwesomeIcon
        sx={{ position: 'absolute', top: 12, right: 14, fontSize: 20, opacity: 0.9 }}
      />
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
            bgcolor: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            flex: '0 0 auto',
          }}
        >
          <GroupsIcon />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.92, fontWeight: 600 }}>
            {subtitle}
          </Typography>
        </Box>
        <DuncitButton
          onClick={onPress}
          endIcon={<ArrowForwardIcon />}
          sx={{
            flex: '0 0 auto',
            bgcolor: 'common.white',
            color: 'primary.main',
            fontWeight: 700,
            px: 1.75,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
          }}
        >
          {buttonLabel}
        </DuncitButton>
      </Stack>
    </Box>
  );
}
