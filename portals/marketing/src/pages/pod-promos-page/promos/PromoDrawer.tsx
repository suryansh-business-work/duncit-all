import { useId, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Divider, Drawer, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { StatusChip } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { PROMO_STATUS_COLOR, PROMO_STATUS_LABEL, isOpenPromo } from '../copy';
import { POD_PROMO, type PodPromo } from '../queries';
import PromoActions from './PromoActions';
import PromoDetails from './PromoDetails';
import PromoFigures from './PromoFigures';
import MakeBannersDialog from '../banners/MakeBannersDialog';

interface Props {
  /** The promotion to show; null keeps the drawer closed. */
  id: string | null;
  canManage: boolean;
  onClose: () => void;
  /** Something on the promotion changed — the table re-reads its page. */
  onChanged: () => void;
}

/** One promotion, read fresh so its figures are current: banner, caption, link, funnel and actions. */
export default function PromoDrawer({ id, canManage, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [making, setMaking] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ podPromo: PodPromo }>(POD_PROMO, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const promo = id ? data?.podPromo : undefined;

  const changed = () => {
    onChanged();
    // The drawer shows the promotion as the server now has it.
    return refetch();
  };

  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 560 } } } }}>
      <Stack spacing={2} sx={{ p: 2 }} data-testid="promo-drawer">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" noWrap>
              {promo?.pod_title ?? t('marketing.podPromo.drawerTitle')}
            </Typography>
          </Box>
          {promo && <StatusChip size="small" status={promo.status} colorMap={PROMO_STATUS_COLOR} label={t(PROMO_STATUS_LABEL[promo.status])} />}
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>
        {loading && !promo && <LinearProgress aria-label={t('marketing.podPromo.loadingPromo')} />}
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}
        {promo && (
          <>
            <PromoDetails promo={promo} />
            <Divider />
            <PromoFigures figures={promo.figures} />
            {canManage && isOpenPromo(promo.status) && <PromoActions promo={promo} onChanged={() => fireAndForget(changed(), logs.portal.marketing, 'pod-promos', 'PromoDrawer')} />}
            <DuncitButton variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setMaking(true)} sx={{ alignSelf: 'flex-start' }} data-testid="promo-make-banners">
              {t('marketing.podPromo.makeBanners')}
            </DuncitButton>
            <MakeBannersDialog
              open={making}
              pod={{ id: promo.pod_id, title: promo.pod_title }}
              collaborators={promo.collaborators}
              canManage={canManage}
              onClose={() => setMaking(false)}
              onScheduled={() => {
                setMaking(false);
                fireAndForget(changed(), logs.portal.marketing, 'pod-promos', 'PromoDrawer');
              }}
            />
          </>
        )}
      </Stack>
    </Drawer>
  );
}

