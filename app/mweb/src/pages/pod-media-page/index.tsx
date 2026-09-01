import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import { mwebPodMediaLabels } from '@duncit/utils';
import { PodMediaView } from '@duncit/host-pod-actions';
import HostPodActionsBridge from '../host-manage-page/HostPodActionsBridge';
import { useEntityPageMeta } from '../../app/pageMeta';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Host Studio > Your Pods > ⋮ > Upload Pod Media — and the page a guest lands
 * on when they follow the link the host sent them.
 *
 * ONE page for both, because they do the same thing: add what the evening
 * looked like. The server decides in what capacity each of them arrived, so
 * the host also gets the card that hands the link out, and anyone the link
 * reached who was not marked present is told so instead of being shown a
 * picker whose write would be refused.
 *
 * Everything below the header is `@duncit/host-pod-actions`' shared view, so
 * the Partners console cannot drift from it (rule 40).
 */
function PodMediaBody({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useMemo(() => mwebPodMediaLabels(t), [t]);
  useEntityPageMeta(labels.pageTitle);

  return (
    <Stack spacing={2} sx={{ p: 1.5, pb: 4 }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <DuncitIconButton aria-label={labels.back} onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon fontSize="small" />
        </DuncitIconButton>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {labels.pageTitle}
        </Typography>
      </Stack>

      <PodMediaView podId={podId} />
    </Stack>
  );
}

export default function PodMediaPage() {
  const { podId = '' } = useParams();
  // The view renders the surface's own media picker, so it needs the same
  // per-surface config the Host Studio list supplies.
  return (
    <HostPodActionsBridge>
      <PodMediaBody podId={podId} />
    </HostPodActionsBridge>
  );
}
