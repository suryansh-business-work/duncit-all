import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { PodKindChooser, type PodKind } from '@duncit/auto-pods';
import { useFeatureFlag, useTranslation } from '@duncit/app-settings';
import { shellAutoPodLabels, shellPodKindLabels } from '@duncit/utils';
import { AutoPodForm } from '../auto-pods-page/auto-pod-form';
import useAutoPodEditor from '../auto-pods-page/useAutoPodEditor';
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
 * which kind first and opens the matching form — and with the `auto_pods` flag
 * off there is only one answer, so it opens the ordinary editor straight away
 * rather than showing a one-sided question.
 */
export default function CreatePodLauncher({ onNormal }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const autoPodsEnabled = useFeatureFlag('auto_pods');
  const [choosing, setChoosing] = useState(false);

  const podKindLabels = useMemo(() => shellPodKindLabels(t), [t]);
  const dismissLabel = useMemo(() => shellAutoPodLabels(t).dismiss, [t]);

  // An Auto Pod is not a pod yet, so it never lands in this table — the queue
  // that does show it is where the admin is taken once it is open.
  const editor = useAutoPodEditor({ t, onSaved: () => navigate(AUTO_PODS_PATH) });

  const start = useCallback(() => {
    if (!autoPodsEnabled) {
      onNormal();
      return;
    }
    setChoosing(true);
  }, [autoPodsEnabled, onNormal]);

  const pick = useCallback(
    (kind: PodKind) => {
      setChoosing(false);
      if (kind === 'AUTO') {
        editor.openCreate();
        return;
      }
      onNormal();
    },
    [editor, onNormal]
  );

  return (
    <>
      <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={start}>
        {podKindLabels.newPodCta}
      </Button>

      <PodKindChooser
        open={choosing}
        labels={podKindLabels}
        onClose={() => setChoosing(false)}
        onPick={pick}
      />

      <AutoPodForm
        open={editor.open}
        initialValues={editor.initialValues}
        saving={editor.saving}
        error={editor.error}
        t={t}
        dismissLabel={dismissLabel}
        onClose={editor.close}
        onSubmit={editor.submit}
      />
    </>
  );
}
