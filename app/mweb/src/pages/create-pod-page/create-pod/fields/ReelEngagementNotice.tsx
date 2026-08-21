import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';

/**
 * Sits above the Pod Reel accordion while the pod has no reel. The accordion is
 * collapsed by default, so the reason a reel is worth recording has to read
 * from outside it; adding one clears the notice. Native twin (rule 27).
 */
export default function ReelEngagementNotice() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      data-testid="create-pod-reel-engagement"
      sx={{
        p: 1.25,
        borderRadius: '16px',
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        border: 1,
        borderColor: alpha(theme.palette.primary.main, 0.4),
      }}
    >
      <LightbulbOutlinedIcon fontSize="small" color="primary" />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {t('mweb.createPod.reelEngagementTitle')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('mweb.createPod.reelEngagementBody')}
        </Typography>
      </Box>
    </Stack>
  );
}
