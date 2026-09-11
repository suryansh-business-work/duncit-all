import { CircularProgress, Tooltip } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import PageBackHeader, { ROUND_HEADER_BUTTON_SX } from './PageBackHeader';

interface Props {
  refreshing: boolean;
  onRefresh: () => void;
}

/** Back · title · refresh. The venue decides elsewhere, so the refresh button is
 * the host's way to ask again without leaving the page. Native twin: the same
 * three controls on the PodPending stack screen's back bar (rule 27). */
export default function PodPendingHeader({ refreshing, onRefresh }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <PageBackHeader
      title={t('mweb.podPending.title')}
      backLabel={t('mweb.common.goBack')}
      action={
        <Tooltip title={t('mweb.podPending.refresh')}>
          <span>
            <DuncitRoundButton
              disabled={refreshing}
              aria-label={t('mweb.podPending.refresh')}
              data-testid="pod-pending-refresh"
              onClick={onRefresh}
              sx={ROUND_HEADER_BUTTON_SX}
            >
              {refreshing ? <CircularProgress size={18} /> : <RefreshRoundedIcon />}
            </DuncitRoundButton>
          </span>
        </Tooltip>
      }
    />
  );
}
