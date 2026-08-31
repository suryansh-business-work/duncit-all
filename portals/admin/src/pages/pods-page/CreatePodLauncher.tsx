import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PodKindChooser, type PodKind } from '@duncit/auto-pods';
import { useFeatureFlag, useTranslation } from '@duncit/app-settings';
import { shellPodKindLabels } from '@duncit/utils';
import { AUTO_PODS_PATH } from '../../config/app-config';

interface Props {
  /** Opens the ordinary pod editor the page already owns. */
  onNormal: () => void;
}

/**
 * The New Pod button and the question behind it.
 *
 * An Auto Pod was previously only reachable from Admin > Auto Pods, so anyone
 * starting where pods actually live could not open one. The button now asks
 * which kind first and opens the matching editor — and with the `auto_pods`
 * flag off there is only one answer, so it opens the ordinary editor straight
 * away rather than showing a one-sided question.
 */
export default function CreatePodLauncher({ onNormal }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const autoPodsEnabled = useFeatureFlag('auto_pods');
  const [choosing, setChoosing] = useState(false);

  const podKindLabels = useMemo(() => shellPodKindLabels(t), [t]);

  const start = useCallback(() => {
    if (!autoPodsEnabled) {
      onNormal();
      return;
    }
    setChoosing(true);
  }, [autoPodsEnabled, onNormal]);

  // An Auto Pod is not a pod yet, so it never lands in this table — its own
  // full-page editor is where the admin is taken.
  const pick = useCallback(
    (kind: PodKind) => {
      setChoosing(false);
      if (kind === 'AUTO') {
        navigate(`${AUTO_PODS_PATH}/new`);
        return;
      }
      onNormal();
    },
    [navigate, onNormal]
  );

  return (
    <>
      <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={start}>
        {podKindLabels.newPodCta}
      </DuncitButton>

      <PodKindChooser
        open={choosing}
        labels={podKindLabels}
        onClose={() => setChoosing(false)}
        onPick={pick}
      />
    </>
  );
}
