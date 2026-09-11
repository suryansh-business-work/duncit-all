import { Box, Card, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * "Host your own pod → Create Pod" as a calm card: an accent icon disc, the
 * title and one green pill. Hosts go straight to pod creation; everyone else is
 * invited into the become-a-host flow. Native twin: HostCtaBanner.
 */
export default function HostCtaBanner({
  isHost,
  onCreatePod,
  onBecomeHost,
}: Readonly<{ isHost: boolean; onCreatePod: () => void; onBecomeHost: () => void }>) {
  const { t } = useTranslation();
  const title = isHost ? t('mweb.home.hostCtaTitle') : t('mweb.home.becomeHostCtaTitle');
  const buttonLabel = isHost ? t('mweb.home.hostCtaButton') : t('mweb.home.becomeHostCtaButton');
  const onPress = isHost ? onCreatePod : onBecomeHost;

  return (
    <Card sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'secondary.main',
            flex: '0 0 auto',
          }}
        >
          <GroupsIcon />
        </Box>
        <Typography sx={{ minWidth: 0, flex: 1, fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>
          {title}
        </Typography>
        <DuncitButton variant="contained" onClick={onPress} sx={{ flex: '0 0 auto', minHeight: 44 }}>
          {buttonLabel}
        </DuncitButton>
      </Stack>
    </Card>
  );
}
