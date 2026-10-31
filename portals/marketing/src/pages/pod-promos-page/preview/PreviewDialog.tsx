import { useId, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, Typography } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { CREATE_POD_PROMO, PREVIEW_POD_PROMO, type PodPromoCandidate, type PodPromoPreview } from '../queries';
import PodPicker from './PodPicker';
import PreviewResult from './PreviewResult';

interface Props {
  open: boolean;
  canManage: boolean;
  onClose: () => void;
  /** A promotion was made — the table and the summary re-read. */
  onPromoted: () => void;
}

/** A promotion that already went out (or is waiting) cannot be made again. */
const BLOCKING = new Set(['PLANNED', 'BANNER_READY', 'SCHEDULED', 'PUBLISHED']);

/** Pick a pod, see the banner and caption it would get, and — for a manager — promote it now. */
export default function PreviewDialog({ open, canManage, onClose, onPromoted }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [picked, setPicked] = useState<PodPromoCandidate | null>(null);
  const [preview, { data, loading, error, reset }] = useMutation<{ previewPodPromo: PodPromoPreview }>(PREVIEW_POD_PROMO);
  const [create, createState] = useMutation(CREATE_POD_PROMO, { refetchQueries: ['PodPromoSummary', 'PodPromoCandidates'] });
  const result = data?.previewPodPromo;

  const pick = (candidate: PodPromoCandidate) => {
    setPicked(candidate);
    reset();
    // A failed render shows in the dialog through the mutation's own error.
    fireAndForget(preview({ variables: { pod_id: candidate.id } }), logs.portal.marketing, 'pod-promos', 'previewPodPromo');
  };

  const promote = async (candidate: PodPromoCandidate) => {
    try {
      await create({ variables: { pod_id: candidate.id } });
      notify(t('marketing.podPromo.promoted', { vars: { title: candidate.title } }), 'success');
      onPromoted();
      onClose();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const blocked = !!picked?.promo_status && BLOCKING.has(picked.promo_status);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{t('marketing.podPromo.previewTitle')}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <PodPicker selectedId={picked?.id ?? null} onPick={pick} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }} aria-live="polite">
            {!picked && (
              <Typography variant="body2" color="text.secondary">
                {t('marketing.podPromo.pickPod')}
              </Typography>
            )}
            {loading && <LinearProgress aria-label={t('marketing.podPromo.rendering')} />}
            {error && <Alert severity="error">{parseApiError(error)}</Alert>}
            {result && <PreviewResult preview={result} />}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {canManage && picked && (
          <DuncitButton
            variant="contained"
            startIcon={<RocketLaunchIcon />}
            disabled={blocked || createState.loading}
            onClick={() => fireAndForget(promote(picked), logs.portal.marketing, 'pod-promos', 'createPodPromo')}
            data-testid="pod-promo-promote"
          >
            {blocked ? t('marketing.podPromo.alreadyPromoted') : t('marketing.podPromo.promoteNow')}
          </DuncitButton>
        )}
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
