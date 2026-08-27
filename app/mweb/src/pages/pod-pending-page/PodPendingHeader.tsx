import { useNavigate } from 'react-router-dom';
import { CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  refreshing: boolean;
  onRefresh: () => void;
}

/** Back · title · refresh. The venue decides elsewhere, so the refresh button is
 * the host's way to ask again without leaving the page. Native twin: the same
 * three controls on the PodPending stack screen's back bar (rule 27). */
export default function PodPendingHeader({ refreshing, onRefresh }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack direction="row" spacing={0.5} sx={{
      alignItems: "center"
    }}>
      <DuncitIconButton size="small" aria-label={t('mweb.common.goBack')} onClick={() => navigate(-1)}>
        <ArrowBackIcon fontSize="small" />
      </DuncitIconButton>
      <Typography variant="h6" sx={{ flex: 1, fontWeight: 800 }}>
        {t('mweb.podPending.title')}
      </Typography>
      <Tooltip title={t('mweb.podPending.refresh')}>
        <span>
          <DuncitIconButton
            size="small"
            disabled={refreshing}
            aria-label={t('mweb.podPending.refresh')}
            data-testid="pod-pending-refresh"
            onClick={onRefresh}
          >
            {refreshing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
